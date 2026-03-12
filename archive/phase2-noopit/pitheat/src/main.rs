use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::io::IsTerminal;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use clap::{Parser, ValueEnum};
use ignore::WalkBuilder;
use serde::Serialize;

type AppResult<T> = Result<T, Box<dyn std::error::Error>>;

#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Render a terminal-friendly repo tree heatmap"
)]
struct Args {
    /// Root path to scan.
    #[arg(default_value = ".")]
    root: PathBuf,

    /// Metric used to size and sort the tree.
    #[arg(long, value_enum, default_value_t = Metric::Words)]
    metric: Metric,

    /// Maximum directory depth to render. Root is depth 0.
    #[arg(long)]
    max_depth: Option<usize>,

    /// Limit displayed children per directory after sorting.
    #[arg(long)]
    top: Option<usize>,

    /// Hide branches below this share of the root total.
    #[arg(long, default_value_t = 0.0)]
    min_percent: f64,

    /// Comma-separated extension allow-list, for example rs,ts,md.
    #[arg(long, value_delimiter = ',')]
    ext: Vec<String>,

    /// Lookback window used by `--metric git-churn`.
    #[arg(long, default_value_t = 30)]
    git_churn_days: u32,

    /// Extra path fragments to skip.
    #[arg(long)]
    ignore: Vec<String>,

    /// Include hidden and ignored files.
    #[arg(long)]
    all: bool,

    /// ANSI color mode.
    #[arg(long, value_enum, default_value_t = ColorMode::Auto)]
    color: ColorMode,

    /// Emit machine-readable JSON instead of terminal output.
    #[arg(long)]
    json: bool,

    /// Write the same JSON payload to a snapshot file.
    #[arg(long)]
    snapshot: Option<PathBuf>,

    /// Named output/profile preset.
    #[arg(long, value_enum)]
    profile: Option<Profile>,

    /// Print D1/D2/D3+ ratios for files under a specific base path.
    #[arg(long)]
    depth_ratios: bool,

    /// Base path used for D1/D2/D3+ classification. Defaults to the scan root.
    #[arg(long)]
    ratio_base: Option<PathBuf>,

    /// Comma-separated extension allow-list for D1/D2/D3+ classification.
    #[arg(long, value_delimiter = ',')]
    ratio_ext: Vec<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum, Serialize)]
enum Metric {
    Words,
    Files,
    Bytes,
    Lines,
    GitChurn,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum, Serialize)]
enum ColorMode {
    Auto,
    Always,
    Never,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum, Serialize)]
enum Profile {
    PitkeelContext,
}

#[derive(Clone, Debug, Default, Serialize)]
struct Stats {
    files: u64,
    words: u64,
    bytes: u64,
    lines: u64,
    git_churn: u64,
}

impl Stats {
    fn selected(&self, metric: Metric) -> u64 {
        match metric {
            Metric::Words => self.words,
            Metric::Files => self.files,
            Metric::Bytes => self.bytes,
            Metric::Lines => self.lines,
            Metric::GitChurn => self.git_churn,
        }
    }
}

#[derive(Clone, Debug)]
struct TreeNode {
    path: PathBuf,
    stats: Stats,
    children: Vec<TreeNode>,
}

#[derive(Debug, Serialize)]
struct Snapshot {
    generated_at_unix_ms: u128,
    root: String,
    metric: Metric,
    options: SnapshotOptions,
    depth_ratios: Option<DepthRatiosSnapshot>,
    tree: SnapshotNode,
}

#[derive(Debug, Serialize)]
struct SnapshotOptions {
    max_depth: Option<usize>,
    top: Option<usize>,
    min_percent: f64,
    ext: Vec<String>,
    git_churn_days: u32,
    ignore: Vec<String>,
    all: bool,
    profile: Option<Profile>,
}

#[derive(Debug, Serialize)]
struct DepthRatiosSnapshot {
    base: String,
    d1_count: u64,
    d2_count: u64,
    d3_count: u64,
    total: u64,
    d1_ratio: f64,
    d2_ratio: f64,
    d3_ratio: f64,
    d1_warning: bool,
}

#[derive(Debug, Serialize)]
struct SnapshotNode {
    path: String,
    name: String,
    stats: Stats,
    metric_value: u64,
    percent_of_root: f64,
    children: Vec<SnapshotNode>,
}

#[derive(Clone, Debug, Default)]
struct DepthRatios {
    base: PathBuf,
    d1_count: u64,
    d2_count: u64,
    d3_count: u64,
    total: u64,
}

impl DepthRatios {
    fn d1_ratio(&self) -> f64 {
        ratio(self.d1_count, self.total)
    }

    fn d2_ratio(&self) -> f64 {
        ratio(self.d2_count, self.total)
    }

    fn d3_ratio(&self) -> f64 {
        ratio(self.d3_count, self.total)
    }

    fn d1_warning(&self) -> bool {
        self.total > 0 && self.d1_ratio() > 0.20
    }
}

fn main() -> AppResult<()> {
    let mut args = Args::parse();
    apply_profile(&mut args);
    let root = fs::canonicalize(&args.root)?;
    let ext_filter = normalize_extensions(&args.ext);
    let ratio_ext_filter = if args.ratio_ext.is_empty() {
        ext_filter.clone()
    } else {
        normalize_extensions(&args.ratio_ext)
    };
    let stats_by_dir = collect_stats(&root, &args, &ext_filter)?;
    let tree = build_tree(&root, &stats_by_dir)?;
    let depth_ratios = if args.depth_ratios {
        let ratio_base = resolve_ratio_base(&root, args.ratio_base.as_deref())?;
        Some(collect_depth_ratios(
            &root,
            &ratio_base,
            &args,
            &ratio_ext_filter,
        )?)
    } else {
        None
    };

    let render = RenderOptions {
        metric: args.metric,
        max_depth: args.max_depth,
        top: args.top,
        min_percent: args.min_percent.max(0.0),
        use_color: use_color(args.color),
    };
    let snapshot = build_snapshot(&tree, depth_ratios.as_ref(), &args, &ext_filter, &render)?;

    if let Some(snapshot_path) = &args.snapshot {
        write_snapshot(snapshot_path, &snapshot)?;
    }

    if args.json {
        print_snapshot_json(&snapshot)?;
        return Ok(());
    }

    if let Some(ratios) = depth_ratios.as_ref() {
        print_depth_ratios(ratios);
    }

    if tree.stats.selected(args.metric) == 0 {
        println!(
            "{}",
            format!("{}  no matching files", display_root_name(&root),)
        );
        return Ok(());
    }

    print_root(&tree, &render);
    render_children(&tree, "", 0, tree.stats.selected(args.metric), &render);

    Ok(())
}

fn apply_profile(args: &mut Args) {
    match args.profile {
        Some(Profile::PitkeelContext) => {
            args.depth_ratios = true;
            if args.ratio_base.is_none() {
                args.ratio_base = Some(PathBuf::from("docs/internal"));
            }
            if args.ratio_ext.is_empty() {
                args.ratio_ext = vec!["md".to_string()];
            }
        }
        None => {}
    }
}

fn collect_stats(
    root: &Path,
    args: &Args,
    ext_filter: &[String],
) -> AppResult<BTreeMap<PathBuf, Stats>> {
    let mut builder = WalkBuilder::new(root);
    builder.hidden(!args.all);
    builder.git_ignore(!args.all);
    builder.git_global(!args.all);
    builder.git_exclude(!args.all);
    builder.ignore(!args.all);
    builder.parents(!args.all);
    builder.follow_links(false);

    let mut by_dir = BTreeMap::new();
    by_dir.insert(root.to_path_buf(), Stats::default());

    for result in builder.build() {
        let entry = match result {
            Ok(entry) => entry,
            Err(err) => return Err(Box::new(err)),
        };
        let path = entry.path();

        if path == root || !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
            continue;
        }

        if should_skip(path, root, &args.ignore) {
            continue;
        }

        if !ext_filter.is_empty() && !matches_extension(path, ext_filter) {
            continue;
        }

        let file_stats = scan_file(path)?;
        if file_stats.files == 0 {
            continue;
        }

        accumulate_file(root, path, file_stats, &mut by_dir)?;
    }

    if args.metric == Metric::GitChurn {
        collect_git_churn(root, args, ext_filter, &mut by_dir)?;
    }

    Ok(by_dir)
}

fn collect_git_churn(
    root: &Path,
    args: &Args,
    ext_filter: &[String],
    by_dir: &mut BTreeMap<PathBuf, Stats>,
) -> AppResult<()> {
    let since = format!("{} days ago", args.git_churn_days);
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .arg("log")
        .arg(format!("--since={since}"))
        .arg("--numstat")
        .arg("--format=tformat:")
        .arg("--relative=.")
        .arg("--")
        .arg(".")
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git log failed: {}", stderr.trim()).into());
    }

    for line in String::from_utf8_lossy(&output.stdout).lines() {
        if let Some((path_text, churn)) = parse_numstat_line(line) {
            let path = Path::new(&path_text);

            if !args.all && is_hidden_path(path) {
                continue;
            }

            if should_skip(path, Path::new("."), &args.ignore) {
                continue;
            }

            if !ext_filter.is_empty() && !matches_extension(path, ext_filter) {
                continue;
            }

            accumulate_churn(root, path, churn, by_dir);
        }
    }

    Ok(())
}

fn collect_depth_ratios(
    root: &Path,
    base: &Path,
    args: &Args,
    ext_filter: &[String],
) -> AppResult<DepthRatios> {
    let mut builder = WalkBuilder::new(base);
    builder.hidden(!args.all);
    builder.git_ignore(!args.all);
    builder.git_global(!args.all);
    builder.git_exclude(!args.all);
    builder.ignore(!args.all);
    builder.parents(!args.all);
    builder.follow_links(false);

    let mut ratios = DepthRatios {
        base: base.to_path_buf(),
        ..DepthRatios::default()
    };

    for result in builder.build() {
        let entry = match result {
            Ok(entry) => entry,
            Err(err) => return Err(Box::new(err)),
        };
        let path = entry.path();

        if path == base || !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
            continue;
        }

        if should_skip(path, root, &args.ignore) {
            continue;
        }

        if !ext_filter.is_empty() && !matches_extension(path, ext_filter) {
            continue;
        }

        let rel = path.strip_prefix(base)?;
        match classify_depth_band(rel) {
            1 => ratios.d1_count += 1,
            2 => ratios.d2_count += 1,
            _ => ratios.d3_count += 1,
        }
        ratios.total += 1;
    }

    Ok(ratios)
}

fn accumulate_file(
    root: &Path,
    path: &Path,
    file_stats: Stats,
    by_dir: &mut BTreeMap<PathBuf, Stats>,
) -> AppResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("file has no parent: {}", path.display()))?;
    let rel_parent = parent.strip_prefix(root)?;

    let mut current = root.to_path_buf();
    add_stats(by_dir.entry(current.clone()).or_default(), &file_stats);

    for component in rel_parent.components() {
        current.push(component.as_os_str());
        add_stats(by_dir.entry(current.clone()).or_default(), &file_stats);
    }

    Ok(())
}

fn accumulate_churn(
    root: &Path,
    relative_path: &Path,
    churn: u64,
    by_dir: &mut BTreeMap<PathBuf, Stats>,
) {
    let parent = relative_path.parent().unwrap_or_else(|| Path::new(""));
    let mut current = root.to_path_buf();
    by_dir.entry(current.clone()).or_default().git_churn += churn;

    for component in parent.components() {
        current.push(component.as_os_str());
        by_dir.entry(current.clone()).or_default().git_churn += churn;
    }
}

fn add_stats(target: &mut Stats, delta: &Stats) {
    target.files += delta.files;
    target.words += delta.words;
    target.bytes += delta.bytes;
    target.lines += delta.lines;
    target.git_churn += delta.git_churn;
}

fn scan_file(path: &Path) -> AppResult<Stats> {
    let bytes = fs::read(path)?;
    let text = String::from_utf8_lossy(&bytes);

    Ok(Stats {
        files: 1,
        bytes: bytes.len() as u64,
        lines: text.lines().count() as u64,
        words: text.split_whitespace().count() as u64,
        git_churn: 0,
    })
}

fn parse_numstat_line(line: &str) -> Option<(String, u64)> {
    let mut parts = line.splitn(3, '\t');
    let added = parts.next()?;
    let deleted = parts.next()?;
    let path = parts.next()?.trim();
    if path.is_empty() {
        return None;
    }

    Some((
        normalize_git_path(path),
        parse_numstat_count(added)? + parse_numstat_count(deleted)?,
    ))
}

fn parse_numstat_count(value: &str) -> Option<u64> {
    if value == "-" {
        Some(0)
    } else {
        value.parse().ok()
    }
}

fn normalize_git_path(path: &str) -> String {
    if let (Some(open), Some(close)) = (path.find('{'), path.rfind('}')) {
        let prefix = &path[..open];
        let suffix = &path[close + 1..];
        let inner = &path[open + 1..close];
        if let Some((_, new)) = inner.split_once("=>") {
            return format!("{}{}{}", prefix, new.trim(), suffix);
        }
    }

    if let Some((_, new)) = path.rsplit_once("=>") {
        return new.trim().to_string();
    }

    path.to_string()
}

fn build_tree(root: &Path, stats_by_dir: &BTreeMap<PathBuf, Stats>) -> AppResult<TreeNode> {
    let mut children_map: HashMap<PathBuf, Vec<PathBuf>> = HashMap::new();

    for dir in stats_by_dir.keys() {
        if dir == root {
            continue;
        }

        if let Some(parent) = dir.parent() {
            children_map
                .entry(parent.to_path_buf())
                .or_default()
                .push(dir.clone());
        }
    }

    build_node(root, stats_by_dir, &children_map)
}

fn build_node(
    path: &Path,
    stats_by_dir: &BTreeMap<PathBuf, Stats>,
    children_map: &HashMap<PathBuf, Vec<PathBuf>>,
) -> AppResult<TreeNode> {
    let stats = stats_by_dir
        .get(path)
        .cloned()
        .ok_or_else(|| format!("missing stats for {}", path.display()))?;

    let mut children = Vec::new();
    if let Some(child_paths) = children_map.get(path) {
        for child in child_paths {
            children.push(build_node(child, stats_by_dir, children_map)?);
        }
    }

    Ok(TreeNode {
        path: path.to_path_buf(),
        stats,
        children,
    })
}

struct RenderOptions {
    metric: Metric,
    max_depth: Option<usize>,
    top: Option<usize>,
    min_percent: f64,
    use_color: bool,
}

fn print_root(root: &TreeNode, render: &RenderOptions) {
    let value = root.stats.selected(render.metric);
    let line = format_line(
        &display_root_name(&root.path),
        value,
        100.0,
        render.metric,
        render.use_color,
    );
    println!("{line}");
}

fn print_depth_ratios(ratios: &DepthRatios) {
    println!("Depth ratios  {}", ratios.base.display());
    if ratios.total == 0 {
        println!("  no matching files");
        println!();
        return;
    }

    println!(
        "  d1:{:.2} / d2:{:.2} / d3+:{:.2}",
        ratios.d1_ratio(),
        ratios.d2_ratio(),
        ratios.d3_ratio()
    );
    println!(
        "  counts  d1:{}  d2:{}  d3+:{}  total:{}",
        ratios.d1_count, ratios.d2_count, ratios.d3_count, ratios.total
    );
    if ratios.d1_warning() {
        println!("  warning  depth-1 ratio exceeds 0.20");
    }
    println!();
}

fn build_snapshot(
    tree: &TreeNode,
    depth_ratios: Option<&DepthRatios>,
    args: &Args,
    ext_filter: &[String],
    render: &RenderOptions,
) -> AppResult<Snapshot> {
    let root_value = tree.stats.selected(args.metric);
    Ok(Snapshot {
        generated_at_unix_ms: SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis(),
        root: tree.path.display().to_string(),
        metric: args.metric,
        options: SnapshotOptions {
            max_depth: args.max_depth,
            top: args.top,
            min_percent: args.min_percent.max(0.0),
            ext: ext_filter.to_vec(),
            git_churn_days: args.git_churn_days,
            ignore: args.ignore.clone(),
            all: args.all,
            profile: args.profile,
        },
        depth_ratios: depth_ratios.map(|ratios| DepthRatiosSnapshot {
            base: ratios.base.display().to_string(),
            d1_count: ratios.d1_count,
            d2_count: ratios.d2_count,
            d3_count: ratios.d3_count,
            total: ratios.total,
            d1_ratio: ratios.d1_ratio(),
            d2_ratio: ratios.d2_ratio(),
            d3_ratio: ratios.d3_ratio(),
            d1_warning: ratios.d1_warning(),
        }),
        tree: snapshot_node(tree, root_value, 0, render),
    })
}

fn snapshot_node(
    node: &TreeNode,
    root_value: u64,
    depth: usize,
    render: &RenderOptions,
) -> SnapshotNode {
    let mut children: Vec<&TreeNode> = node
        .children
        .iter()
        .filter(|child| should_render(child, root_value, render))
        .collect();
    children.sort_by(|a, b| {
        b.stats
            .selected(render.metric)
            .cmp(&a.stats.selected(render.metric))
            .then_with(|| display_name(&a.path).cmp(&display_name(&b.path)))
    });

    if let Some(top) = render.top {
        if children.len() > top {
            children.truncate(top);
        }
    }

    let allow_children = render
        .max_depth
        .map(|max_depth| depth < max_depth)
        .unwrap_or(true);
    let child_nodes = if allow_children {
        children
            .into_iter()
            .map(|child| snapshot_node(child, root_value, depth + 1, render))
            .collect()
    } else {
        Vec::new()
    };

    let metric_value = node.stats.selected(render.metric);
    SnapshotNode {
        path: node.path.display().to_string(),
        name: display_name(&node.path),
        stats: node.stats.clone(),
        metric_value,
        percent_of_root: percent_of_root(metric_value, root_value),
        children: child_nodes,
    }
}

fn print_snapshot_json(snapshot: &Snapshot) -> AppResult<()> {
    println!("{}", serde_json::to_string_pretty(snapshot)?);
    Ok(())
}

fn write_snapshot(path: &Path, snapshot: &Snapshot) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }
    fs::write(path, serde_json::to_string_pretty(snapshot)?)?;
    Ok(())
}

fn render_children(
    node: &TreeNode,
    prefix: &str,
    depth: usize,
    root_value: u64,
    render: &RenderOptions,
) {
    if let Some(max_depth) = render.max_depth {
        if depth >= max_depth {
            return;
        }
    }

    let mut children: Vec<&TreeNode> = node
        .children
        .iter()
        .filter(|child| should_render(child, root_value, render))
        .collect();

    children.sort_by(|a, b| {
        b.stats
            .selected(render.metric)
            .cmp(&a.stats.selected(render.metric))
            .then_with(|| display_name(&a.path).cmp(&display_name(&b.path)))
    });

    if let Some(top) = render.top {
        if children.len() > top {
            children.truncate(top);
        }
    }

    for (index, child) in children.iter().enumerate() {
        let is_last = index + 1 == children.len();
        let branch = if is_last { "└── " } else { "├── " };
        let next_prefix = if is_last { "    " } else { "│   " };
        let value = child.stats.selected(render.metric);
        let percent = if root_value == 0 {
            0.0
        } else {
            (value as f64 / root_value as f64) * 100.0
        };
        let label = format!("{prefix}{branch}{}", display_name(&child.path));
        println!(
            "{}",
            format_line(&label, value, percent, render.metric, render.use_color)
        );
        render_children(
            child,
            &format!("{prefix}{next_prefix}"),
            depth + 1,
            root_value,
            render,
        );
    }
}

fn should_render(node: &TreeNode, root_value: u64, render: &RenderOptions) -> bool {
    let value = node.stats.selected(render.metric);
    if value == 0 {
        return false;
    }

    if root_value == 0 {
        return true;
    }

    let percent = (value as f64 / root_value as f64) * 100.0;
    percent >= render.min_percent
}

fn percent_of_root(value: u64, root_value: u64) -> f64 {
    if root_value == 0 {
        0.0
    } else {
        (value as f64 / root_value as f64) * 100.0
    }
}

fn format_line(label: &str, value: u64, percent: f64, metric: Metric, use_color: bool) -> String {
    let bar = heat_bar(percent);
    let color = heat_color(percent);
    let metric_text = format_metric(value, metric);
    let bar_text = if use_color {
        colorize(&bar, color)
    } else {
        bar
    };

    format!(
        "{label:<52} {metric_text:>12} {percent:>6.1}%  {bar_text}",
        label = label,
        metric_text = metric_text,
        percent = percent
    )
}

fn format_metric(value: u64, metric: Metric) -> String {
    match metric {
        Metric::Words => format!("{} words", compact_number(value)),
        Metric::Files => format!("{} files", compact_number(value)),
        Metric::Bytes => format!("{}B", compact_bytes(value)),
        Metric::Lines => format!("{} lines", compact_number(value)),
        Metric::GitChurn => format!("{} churn", compact_number(value)),
    }
}

fn compact_number(value: u64) -> String {
    match value {
        0..=999 => value.to_string(),
        1_000..=999_999 => format!("{:.1}k", value as f64 / 1_000.0),
        1_000_000..=999_999_999 => format!("{:.1}m", value as f64 / 1_000_000.0),
        _ => format!("{:.1}b", value as f64 / 1_000_000_000.0),
    }
}

fn compact_bytes(value: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;

    let bytes = value as f64;
    if bytes < KB {
        format!("{value}")
    } else if bytes < MB {
        format!("{:.1}K", bytes / KB)
    } else if bytes < GB {
        format!("{:.1}M", bytes / MB)
    } else {
        format!("{:.1}G", bytes / GB)
    }
}

fn heat_bar(percent: f64) -> String {
    let width = 10usize;
    let filled = ((percent.clamp(0.0, 100.0) / 100.0) * width as f64).round() as usize;
    let mut bar = String::with_capacity(width);
    for idx in 0..width {
        if idx < filled {
            bar.push('█');
        } else {
            bar.push('░');
        }
    }
    bar
}

fn heat_color(percent: f64) -> &'static str {
    if percent >= 40.0 {
        "\x1b[31m"
    } else if percent >= 15.0 {
        "\x1b[33m"
    } else {
        "\x1b[32m"
    }
}

fn colorize(text: &str, color: &str) -> String {
    format!("{color}{text}\x1b[0m")
}

fn use_color(mode: ColorMode) -> bool {
    match mode {
        ColorMode::Always => true,
        ColorMode::Never => false,
        ColorMode::Auto => std::io::stdout().is_terminal(),
    }
}

fn display_root_name(path: &Path) -> String {
    display_name(path)
}

fn display_name(path: &Path) -> String {
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.display().to_string());
    format!("{name}/")
}

fn normalize_extensions(exts: &[String]) -> Vec<String> {
    exts.iter()
        .flat_map(|value| value.split(','))
        .map(|value| value.trim().trim_start_matches('.').to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .collect()
}

fn resolve_ratio_base(root: &Path, candidate: Option<&Path>) -> AppResult<PathBuf> {
    let base = match candidate {
        Some(path) if path.is_absolute() => path.to_path_buf(),
        Some(path) => root.join(path),
        None => root.to_path_buf(),
    };

    Ok(fs::canonicalize(base)?)
}

fn classify_depth_band(rel: &Path) -> usize {
    let depth = rel.components().count().saturating_sub(1);
    match depth {
        0 => 1,
        1 => 2,
        _ => 3,
    }
}

fn ratio(part: u64, total: u64) -> f64 {
    if total == 0 {
        0.0
    } else {
        part as f64 / total as f64
    }
}

fn matches_extension(path: &Path, exts: &[String]) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let normalized = ext.to_ascii_lowercase();
            exts.iter().any(|candidate| candidate == &normalized)
        })
        .unwrap_or(false)
}

fn should_skip(path: &Path, root: &Path, patterns: &[String]) -> bool {
    if patterns.is_empty() {
        return false;
    }

    let rel = path.strip_prefix(root).unwrap_or(path);
    let rel_text = rel.to_string_lossy();
    patterns.iter().any(|pattern| {
        rel_text.contains(pattern)
            || rel
                .components()
                .any(|component| component.as_os_str().to_string_lossy() == pattern.as_str())
    })
}

fn is_hidden_path(path: &Path) -> bool {
    path.components().any(|component| {
        component
            .as_os_str()
            .to_str()
            .map(|part| part.starts_with('.') && part != "." && part != "..")
            .unwrap_or(false)
    })
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use super::{
        Args, Metric, Profile, apply_profile, classify_depth_band, compact_bytes, compact_number,
        format_metric, heat_bar, is_hidden_path, normalize_extensions, normalize_git_path,
        parse_numstat_line, percent_of_root, ratio,
    };

    #[test]
    fn compacts_numbers_for_display() {
        assert_eq!(compact_number(999), "999");
        assert_eq!(compact_number(1_200), "1.2k");
        assert_eq!(compact_number(2_300_000), "2.3m");
    }

    #[test]
    fn compacts_bytes_for_display() {
        assert_eq!(compact_bytes(999), "999");
        assert_eq!(compact_bytes(2_048), "2.0K");
        assert_eq!(compact_bytes(2_097_152), "2.0M");
    }

    #[test]
    fn normalizes_extensions() {
        assert_eq!(
            normalize_extensions(&["rs, TSX".to_string(), ".md".to_string()]),
            vec!["rs", "tsx", "md"]
        );
    }

    #[test]
    fn formats_metric_labels() {
        assert_eq!(format_metric(1200, Metric::Words), "1.2k words");
        assert_eq!(format_metric(7, Metric::Files), "7 files");
    }

    #[test]
    fn builds_heat_bar() {
        assert_eq!(heat_bar(0.0), "░░░░░░░░░░");
        assert_eq!(heat_bar(50.0), "█████░░░░░");
        assert_eq!(heat_bar(100.0), "██████████");
    }

    #[test]
    fn classifies_depth_bands_like_pitkeel() {
        assert_eq!(classify_depth_band(Path::new("one.md")), 1);
        assert_eq!(classify_depth_band(Path::new("sub/one.md")), 2);
        assert_eq!(classify_depth_band(Path::new("sub/deeper/one.md")), 3);
    }

    #[test]
    fn computes_safe_ratios() {
        assert_eq!(ratio(0, 0), 0.0);
        assert!((ratio(1, 4) - 0.25).abs() < f64::EPSILON);
    }

    #[test]
    fn applies_pitkeel_context_profile_defaults() {
        let mut args = Args {
            root: PathBuf::from("."),
            metric: Metric::Words,
            max_depth: None,
            top: None,
            min_percent: 0.0,
            ext: vec![],
            git_churn_days: 30,
            ignore: vec![],
            all: false,
            color: super::ColorMode::Never,
            json: false,
            snapshot: None,
            profile: Some(Profile::PitkeelContext),
            depth_ratios: false,
            ratio_base: None,
            ratio_ext: vec![],
        };

        apply_profile(&mut args);

        assert!(args.depth_ratios);
        assert_eq!(args.ratio_base, Some(PathBuf::from("docs/internal")));
        assert_eq!(args.ratio_ext, vec!["md".to_string()]);
    }

    #[test]
    fn explicit_ratio_settings_override_profile_defaults() {
        let mut args = Args {
            root: PathBuf::from("."),
            metric: Metric::Words,
            max_depth: None,
            top: None,
            min_percent: 0.0,
            ext: vec![],
            git_churn_days: 30,
            ignore: vec![],
            all: false,
            color: super::ColorMode::Never,
            json: false,
            snapshot: None,
            profile: Some(Profile::PitkeelContext),
            depth_ratios: false,
            ratio_base: Some(PathBuf::from("docs/custom")),
            ratio_ext: vec!["txt".to_string()],
        };

        apply_profile(&mut args);

        assert_eq!(args.ratio_base, Some(PathBuf::from("docs/custom")));
        assert_eq!(args.ratio_ext, vec!["txt".to_string()]);
    }

    #[test]
    fn computes_percent_of_root() {
        assert_eq!(percent_of_root(0, 0), 0.0);
        assert!((percent_of_root(25, 100) - 25.0).abs() < f64::EPSILON);
    }

    #[test]
    fn parses_numstat_lines() {
        assert_eq!(
            parse_numstat_line("12\t8\tlib/auth/users.ts"),
            Some(("lib/auth/users.ts".to_string(), 20))
        );
        assert_eq!(
            parse_numstat_line("-\t-\tstatic/logo.png"),
            Some(("static/logo.png".to_string(), 0))
        );
    }

    #[test]
    fn normalizes_git_rename_paths() {
        assert_eq!(
            normalize_git_path("src/{old => new}/file.rs"),
            "src/new/file.rs"
        );
        assert_eq!(
            normalize_git_path("old/path.rs => new/path.rs"),
            "new/path.rs"
        );
    }

    #[test]
    fn detects_hidden_paths() {
        assert!(is_hidden_path(Path::new(".claude/agents/architect.md")));
        assert!(!is_hidden_path(Path::new("docs/internal/lexicon.md")));
    }
}
