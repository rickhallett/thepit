# Agentic Engineer Learning Priorities

**Date:** 2026-03-09
**Author:** Drafting polecat, dispatched by Operator
**Provenance:** noopit calibration run. Builds on the agent-native software taxonomy (same directory). Written for the HN thesis: governance > product, operational training > code output, Linux was always the agent OS.
**Status:** DRAFT — for Operator review

**Backref:** `docs/research/agent-native-software-taxonomy.md` (the 48-category analysis establishing the 75% reducibility finding and the 10 principles of agent-native software)

---

## 1. The Priority Matrix: What Agentic Engineers Should Learn

The taxonomy established that 75% of software reduces to CLI/API operations and that agents operate at the data layer, bypassing the GUI entirely. This reorders the engineering skill hierarchy. What follows is the priority matrix for someone whose job is commanding agents that operate Linux machines.

### Tier 1 — Critical (learn this first, it's load-bearing)

**Process management and verification engineering**

The taxonomy's Principle 4 (feedback is structural, not visual) makes this the central skill. If you can't design verification gates — the checks that tell you whether agent output is correct — you have no way to know whether the work is done. The gate (`typecheck && lint && test`) is survival. Without it, agents produce plausible-but-wrong output (the "not wrong" anti-pattern from the slopodar) and you won't catch it until production.

Failure mode without it: You review agent output by reading it, which means you're doing the work yourself at L12, which means you're slower than doing it without agents. The entire leverage model collapses.

Specific skills: writing tests that verify behaviour (not just assertions that pass), designing CI/CD pipelines, understanding exit codes and structured error output, building automated quality gates, knowing what "done" looks like in machine-verifiable terms.

**Linux CLI fluency (operational, not theoretical)**

The agent's hands are `bash`, `coreutils`, `git`, `curl`, `jq`, `grep`, `find`, `xargs`, `ssh`, `rsync`. If you don't know what these do, you can't read what the agent is doing, you can't diagnose when it does the wrong thing, and you can't write instructions that produce correct behaviour. This is literacy, not expertise.

Failure mode without it: You can't distinguish between an agent correctly using `find . -name "*.log" -mtime +30 -delete` and an agent about to recursively delete your home directory. The difference is one flag. You need to be able to read the command and know.

Specific skills: navigating the filesystem from a terminal, reading and writing shell commands, understanding pipes and redirection, file permissions, process management (`ps`, `kill`, `top`), package management basics, SSH, environment variables, basic regex.

**Containerisation (practical Docker/Podman)**

The midget swarm POC proved agents operate in containers. If you can't build, run, debug, and network containers, you can't deploy agents. A Dockerfile is the agent's birth certificate — it defines what the agent has access to.

Failure mode without it: You can't control what an agent can do. An agent with root in an unprivileged container is safe. An agent with root in a privileged container with host network is a security incident. The difference is container configuration, and if you don't understand it, you're guessing.

Specific skills: writing Dockerfiles, `docker build`/`run`/`exec`/`logs`, multi-stage builds, volume mounts, networking between containers, resource limits (`--memory`, `--cpus`), understanding the relationship between containers and the host.

**Version control (git as infrastructure, not just source control)**

Git is the agent's audit trail, undo mechanism, and coordination protocol. The taxonomy showed that knowledge management reduces to "text files + search + git." When agents produce work, git is how you track what changed, revert what's wrong, and maintain the chain of decisions.

Failure mode without it: You lose the ability to roll back agent mistakes. An agent that makes 30 commits in a session has created a recoverable history. An agent that makes one commit has created a binary choice: accept everything or reject everything. Atomic commits are how you maintain control at machine speed.

Specific skills: branching strategy, interactive rebase (for cleaning up agent commits), `git diff`, `git log --graph`, understanding merge vs rebase, `git bisect` for finding where things broke, `.gitignore`, hooks (pre-commit gates).

**Clear written specification**

The polecat model (one-shot, fresh context, plan file as input) makes your written instructions the sole determinant of output quality. Ambiguous instructions produce ambiguous output. The agent doesn't ask clarifying questions in the one-shot model — it pattern-matches on whatever you wrote. "Make it look good" is a taste instruction the agent can't execute. "Use 16px body text, 1.5 line height, system font stack, maximum 80ch line width" is a specification it can.

Failure mode without it: You spend more time correcting agent output than you would have spent doing the work yourself. Every round of correction is a fresh context window, and each one costs tokens and time.

Specific skills: writing precise requirements, defining acceptance criteria in testable terms, decomposing work into atomic tasks, writing API contracts and type signatures before implementation, knowing when a requirement is under-specified.

### Tier 2 — High Value (compounds over time)

**Networking fundamentals**

Agents that operate as containers on a cluster need to communicate. Your k8s pods need service discovery, your containers need to reach APIs, your agent swarm needs to coordinate. TCP/IP, DNS, HTTP, ports, firewalls — this is the connective tissue of agent infrastructure.

Failure mode without it: Your agents work locally but fail in production because of network partitions, DNS resolution failures, or firewall rules you didn't know existed. Debugging networking problems without understanding networking is guesswork.

Specific skills: TCP/IP basics, DNS resolution, HTTP request/response lifecycle, ports and listening, `ss`/`netstat`, `curl` for debugging, iptables/nftables basics, understanding NAT and port forwarding, TLS/SSL certificate mechanics.

**Configuration as code (IaC)**

Infrastructure as code is how you reproduce your agent infrastructure. If your agent deployment is a series of manual steps, you can't recover from failure, you can't scale, and you can't hand it to someone else.

Failure mode without it: Your setup works on your machine but you can't reproduce it. A crashed node means rebuilding from memory. You become the single point of failure for your own infrastructure.

Specific skills: Terraform or Pulumi basics, Ansible for configuration management, Kubernetes manifests (if using k8s), docker-compose for multi-container setups, Makefile/justfile for task automation, understanding declarative vs imperative configuration.

**Monitoring and observability**

You need to know what your agents are doing. How much CPU/memory are they consuming? Are they stuck in a loop? Did a container OOM-kill? What's the error rate? Without monitoring, you're blind. With 50 agents running on 6 nodes, you can't SSH into each one.

Failure mode without it: An agent silently fails, consumes all available memory on a node, and cascading failures take down adjacent agents. You don't know until someone notices the output stopped.

Specific skills: reading `/proc` and `/sys`, Prometheus + Grafana basics, log aggregation (journalctl, Loki, ELK), understanding memory and CPU metrics, alert design (what conditions matter enough to wake you up), `docker stats`, `kubectl top`.

**Security fundamentals**

Agents running in containers with network access and tool-use capabilities are an attack surface. If an agent can be prompt-injected into running `rm -rf /` or exfiltrating secrets via `curl`, your infrastructure is compromised.

Failure mode without it: You grant agents more capability than they need because restricting capabilities requires understanding what capabilities exist. An agent container with access to your SSH keys, AWS credentials, and host filesystem is a breach waiting for a prompt injection to trigger it.

Specific skills: principle of least privilege, Linux capabilities and what they grant, seccomp profiles, read-only filesystems for agent containers, secret management (not hardcoded, injected at runtime), network segmentation, understanding what prompt injection is and how to mitigate it through infrastructure (not just through prompting).

**Shell scripting (beyond commands, into composition)**

Tier 1 covers reading commands. This tier covers writing compositions: scripts that chain tools, handle errors, parse output, and automate workflows. The polecat dispatch model means you're writing scripts that configure and launch agents, collect results, and verify output.

Failure mode without it: Every agent dispatch is manual. You can't automate the meta-work of managing agents. You become the bottleneck in your own pipeline.

Specific skills: bash control flow (`if`, `for`, `while`), error handling (`set -euo pipefail`), functions, argument parsing, `xargs` and `parallel` for concurrent execution, `jq` for JSON processing, `awk` for structured text, heredocs for template generation.

### Tier 3 — Useful (good ROI when needed)

**Kernel-level understanding (conceptual, not operational)**

Understanding that containers are namespaces + cgroups + overlayfs helps you reason about isolation and resource limits. You don't need to compile a kernel, but knowing that a container shares the host kernel explains why a kernel exploit in a container compromises the host.

When it pays off: debugging resource contention between containers, understanding why a process inside a container can't access a device, reasoning about security boundaries.

Specific skills: what cgroups control (CPU, memory, I/O), what namespaces isolate (PID, network, mount, user), how overlayfs layers work, what `/proc` exposes, basic understanding of syscalls and what `strace` shows.

**Database operations**

Many agent workflows involve reading from or writing to databases. The taxonomy showed database management is fully CLI-reducible (`psql`, `sqlite3`). Understanding SQL and database operations means you can verify agent data manipulation.

When it pays off: when agents interact with production data, when you need to verify agent output against a database, when designing data pipelines that agents operate.

Specific skills: SQL (SELECT, JOIN, aggregation, window functions), `psql`/`sqlite3` CLI usage, understanding indexes and query plans (for catching agent-written queries that are correct but catastrophically slow), basic schema design, migration tools.

**Programming language depth (at least one language well)**

You need to read agent-generated code with enough fluency to spot structural problems, not just syntax errors. The agent writes syntactically correct code by default. The bugs are in logic, architecture, and edge cases. Reading code is more important than writing it, but you need depth in at least one language to calibrate your reading.

When it pays off: code review of agent output, understanding whether agent-generated tests actually test what they claim (the "right answer, wrong work" anti-pattern), designing system architecture that agents implement.

Specific skills: type systems (catching agent errors at compile time), testing patterns, error handling idioms, concurrency models (when agents are doing async work), reading stack traces, understanding dependency management.

**Distributed systems concepts**

Running agent swarms across multiple machines introduces distributed systems problems: network partitions, clock skew, consensus, eventual consistency. You don't need to implement Raft, but you need to recognise when your agents are facing a distributed systems problem.

When it pays off: when your 6-node cluster has a network partition and 3 agents continue operating on stale state, when two agents try to modify the same file on shared storage, when agent coordination requires ordering guarantees.

Specific skills: CAP theorem (understanding the tradeoffs), understanding eventual consistency, leader election concepts, idempotent operations (so agents can safely retry), understanding what happens when the network lies.

### Tier 4 — Declining (was valuable, becoming less so)

**GUI application development (frontend frameworks)**

Building React/Vue/Angular applications remains necessary when humans need interfaces, but the 75% reducibility finding means the demand shifts. You'll build fewer GUIs and more CLIs and APIs. The agent doesn't need a dashboard; it needs a structured API. Human oversight interfaces remain necessary but become a smaller fraction of the total engineering surface.

Why it's declining: Agents building frontends can produce functional UIs from specifications. The human reviews for taste (Principle 10), but the implementation is delegable. The bottleneck moves from "can you build it" to "can you specify what it should look like and verify it meets your standards."

**Manual testing and QA**

Clicking through an application to verify it works is exactly the kind of work the taxonomy shows agents can do. Visual verification of UI output still requires human eyes at the taste boundary, but functional testing, integration testing, and regression testing are agent-native.

Why it's declining: the midget swarm POC demonstrated agents can see screens, click, and verify. Automated test suites that agents run are replacing manual QA passes. The human role moves to designing what to test and reviewing results.

**Memorised syntax and API surfaces**

Knowing the exact flags for `ffmpeg` or the precise API for `requests.post()` is less valuable when the agent can look it up and use it correctly. Pattern recognition ("I need a tool that does X") is more valuable than syntax memorisation ("the flag is `-c:v libx264`").

Why it's declining: Agents have effectively infinite API knowledge from training data. Your value is knowing what to ask for, not how to spell it.

**Single-language deep specialisation (without breadth)**

Deep expertise in one language without understanding the ecosystem it operates in is less valuable when agents can write fluent code in any language. The polyglot who understands systems (networking, filesystem, processes) across languages has more leverage than the Rust expert who can't configure a container.

Why it's declining: the bottleneck is no longer writing code in language X. It's orchestrating systems that may involve Python, Bash, SQL, YAML, and TypeScript in the same workflow.

### Tier 5 — Obsolete (actively unhelpful to invest in)

**IDE mastery**

Learning keyboard shortcuts, plugin ecosystems, and advanced IDE features is optimising for a tool the agent doesn't use. The taxonomy showed IDEs are fully reducible — the agent works with files, compilers, and language servers directly. Time spent mastering VS Code extensions would be better spent learning `grep`, `sed`, and shell scripting.

Why it's actively unhelpful: IDE mastery builds habits around a visual workflow that doesn't transfer to agent orchestration. You learn to "see" code through the IDE's rendering instead of through the text. This makes you worse at reading agent output, which is plain text.

**GUI-based DevOps tools**

Portainer, Lens, Docker Desktop, cloud provider consoles as your primary interface. These tools hide the actual operations behind graphical abstractions. When you need to debug why an agent container isn't starting, you need `docker logs` and `docker inspect`, not a GUI that shows a red circle.

Why it's actively unhelpful: building muscle memory around GUI DevOps tools means you can't operate in the same mode as your agents. You're maintaining two mental models (GUI for you, CLI for agents) instead of one.

**Drag-and-drop workflow builders**

Zapier, n8n, Power Automate as primary automation tools. These are GUI wrappers around API calls with visual flowcharts. An agent composing `curl` pipelines or writing a Python script is strictly more powerful, more debuggable, and more composable.

Why it's actively unhelpful: these tools teach you to think in GUI terms (connect this box to that box) rather than in composition terms (pipe this output to that input). The composition model is what your agents use.

---

## 2. Deep Linux Intimacy: The ROI Curve by Domain

The central question is not whether Linux knowledge is useful (it obviously is) but where the returns diminish. For each domain, I assess: what's the practical leverage, where does it plateau, and what's the specific return for commanding agent swarms.

### Filesystem and permissions

**Depth required: moderate-to-deep**

**High-leverage knowledge:**
- Standard hierarchy (`/etc`, `/var`, `/tmp`, `/proc`, `/sys`, `/dev`). Agents read config from `/etc`, write temporary files to `/tmp`, and inspect system state from `/proc`. You need to know where things are.
- Permissions model (rwx, owner/group/other). If an agent container mounts a host directory and can't write to it, permissions are why. If an agent can read your SSH keys, permissions are why.
- File descriptors (stdin=0, stdout=1, stderr=2) and redirection. This is how pipes work. Agents compose tools via pipes. You need to understand the plumbing.

**Worth knowing:**
- Inodes (what they are, what "no space left on device" means when `df` shows space available). When an agent creates millions of small files in `/tmp`, you'll hit inode exhaustion before disk exhaustion.
- Symlinks vs hardlinks (agents working with config files that are symlinks to other locations).
- `tmpfs` and memory-backed filesystems (useful for agent scratch space that shouldn't persist).

**Diminishing returns:**
- ext4 internals (journal structure, block allocation, extent trees). You'll never debug this in an agent context.
- ACLs (Access Control Lists) beyond basic POSIX. Standard permissions cover 95% of agent container use cases.
- Extended attributes. Irrelevant to agent operations.

**ROI curve:** Steep rise through permissions and hierarchy, moderate return through inodes and mount mechanics, flat after that. Budget: 2-3 days focused study, then learn the rest when you hit a specific problem.

### Process management

**Depth required: deep**

This is where agentic engineering diverges most from traditional software engineering. You're running N processes (agents) on M machines with finite resources, and you need to understand what happens when things go wrong.

**High-leverage knowledge:**
- Signals (SIGTERM, SIGKILL, SIGHUP, SIGPIPE). When you stop an agent container, Docker sends SIGTERM. If the agent's process doesn't handle it, Docker sends SIGKILL after a timeout. If the agent is mid-operation when killed, you need to understand what state it was in.
- Process states (running, sleeping, zombie, stopped). When `top` shows a zombie process inside an agent container, that's a child process that wasn't reaped. In containers, PID 1 semantics matter — your agent process IS PID 1 unless you use `--init`.
- cgroups (v2). This is how Docker resource limits work. `--memory=512m` creates a cgroup with a memory limit. When the agent exceeds it, the OOM killer fires. Understanding cgroups means understanding *exactly* what resources your agents get.

**Worth knowing:**
- Namespaces (PID, network, mount, user, UTS, IPC). These are the isolation boundaries of containers. Knowing that a PID namespace means the agent sees only its own processes explains both the security model and why `ps aux` inside a container looks different from outside.
- Init systems (systemd basics). If you're running agents as systemd services on bare metal (not just containers), you need unit files, dependencies, restart policies.
- `/proc` filesystem as a process inspection tool. `/proc/[pid]/status`, `/proc/[pid]/fd`, `/proc/[pid]/maps`. When you need to debug what an agent process is doing, this is where you look.

**Diminishing returns:**
- Writing custom init systems. Use `tini` or `dumb-init` for containers, systemd for services.
- Kernel scheduler internals (CFS, deadline scheduling). You set priorities via `nice`; you don't need to understand the O(1) scheduler.
- `ptrace` and debugging at the syscall level (useful for security research, overkill for agent management).

**ROI curve:** Steep rise through signals and cgroups, sustained return through namespaces, then flat. This domain has the highest sustained ROI because process management IS agent management. Budget: 1 week focused study, then ongoing learning through practice.

### Networking

**Depth required: moderate-to-deep**

Agent containers need to talk to each other, to APIs, and to the host. Networking is the most common source of "it works locally but fails in the cluster" problems.

**High-leverage knowledge:**
- TCP/IP fundamentals (what a socket is, what a port is, what "connection refused" vs "connection timeout" vs "no route to host" means). These three errors are different problems with different solutions. If you can't distinguish them, you can't debug agent communication failures.
- DNS resolution. When agent A needs to reach agent B by name, DNS is how. In Docker, this is automatic via the embedded DNS server on bridge networks. In k8s, CoreDNS handles it. When it breaks, you need `dig` and `nslookup`.
- HTTP mechanics (request/response, headers, status codes, methods). Agents primarily communicate via HTTP APIs. Understanding `Content-Type`, `Authorization`, `Accept` headers, and what a 429 means (rate-limited) vs 502 (upstream is down) is essential.

**Worth knowing:**
- iptables/nftables basics. Container networking involves NAT rules (how a container on 172.17.0.x reaches the internet) and port forwarding. When your agent container can't reach an external API, the firewall might be why.
- Bridge networking vs host networking vs overlay networking. Docker uses bridge networks by default. k8s uses overlay networks (Flannel, Cilium). Understanding the topology helps debug connectivity.
- TLS/SSL (what certificates are, what a certificate chain is, what "certificate verify failed" means). Agents calling HTTPS APIs hit TLS errors when certificates are misconfigured or CA bundles are missing in containers.

**Diminishing returns:**
- BGP, OSPF, routing protocols. Unless you're running your own network infrastructure at scale.
- Kernel network stack internals (netfilter hooks, sk_buff structure). Useful for CNI plugin developers, not agent operators.
- Advanced traffic shaping (tc, HTB, DSCP marking). Edge case for most agent workloads.

**ROI curve:** Steep through TCP/IP and DNS, moderate through firewalls and container networking, then flat. Budget: 3-4 days focused study, with the Bandit wargames providing good practical reinforcement.

### Package management

**Depth required: shallow-to-moderate**

**High-leverage knowledge:**
- Using `apt`/`pacman`/`dnf` to install packages. Your agent container Dockerfiles contain `apt-get install` lines. You need to know what you're installing and why.
- Understanding dependency resolution at a conceptual level: why installing package X pulls in 47 dependencies, and why that matters for container image size and attack surface.
- Pinning versions. An agent container that installs `latest` today may behave differently tomorrow.

**Worth knowing:**
- Building packages from source (when the agent needs a tool that isn't in the repos).
- `apt-cache`, `pacman -Ss` for searching, `dpkg -L` for listing files in a package.

**Diminishing returns:**
- Package maintainership (writing PKGBUILD, debuild workflows).
- Repository management (setting up your own apt repo).
- Deep dependency resolution algorithms (SAT solving).

**ROI curve:** Steep rise to basic competence, then flat. You need enough to build container images and install tools. Budget: 1 day.

### Shell and scripting

**Depth required: deep**

Shell scripting is how you automate agent orchestration. The Makefile in this project contains 26 polecat tasks — each one is a shell command that dispatches an agent with specific context.

**High-leverage knowledge:**
- Bash control structures and error handling. `set -euo pipefail` should be muscle memory. A script that continues after an error is a script that hides failures.
- Variable expansion, quoting rules (when `$VAR` vs `"$VAR"` vs `'$VAR'` matters). Misquoted variables are the #1 source of shell script bugs, and they produce silent data corruption — the command runs, but on the wrong arguments.
- `xargs` and `parallel` for concurrent execution. Dispatching 10 agents simultaneously from a shell script is a `parallel` invocation.
- `jq` for JSON parsing. Agents produce structured output. You parse it with `jq`.
- Here documents and here strings for template generation. Agent prompt files are templates filled with context.

**Worth knowing:**
- POSIX compliance vs bash-isms. If your agents run on different distros (Debian, Arch, Ubuntu — the homelab topology), POSIX-compatible scripts are more portable.
- Job control (`&`, `wait`, `bg`, `fg`). Managing background agent processes.
- Signal trapping (`trap`) for cleanup when scripts are interrupted.

**Diminishing returns:**
- Bash internals (how the parser works, how word splitting is implemented).
- Advanced parameter expansion (`${var//pattern/replacement}` — use `sed` instead for readability).
- Bash as a general-purpose programming language. If your script exceeds 100 lines, rewrite it in Python.

**ROI curve:** Continuously high. Shell scripting is the glue of agent orchestration. There is no plateau because the use cases keep expanding. Budget: 1 week initial study, then continuous refinement through daily use.

### Kernel

**Depth required: shallow (conceptual)**

**High-leverage knowledge:**
- What the kernel does (process scheduling, memory management, device access, syscalls). Conceptual understanding of the boundary between userspace and kernel space.
- `/proc` and `/sys` as kernel state inspection interfaces. Reading `/proc/meminfo`, `/proc/cpuinfo`, `/proc/[pid]/status`.
- Kernel parameters (`sysctl`) that affect container workloads: `vm.overcommit_memory`, `net.core.somaxconn`, `fs.file-max`. When 50 agent containers collectively open more file descriptors than the kernel allows, you need to know which knob to turn.

**Worth knowing:**
- Basic understanding of syscalls (what `strace` output means). When an agent process hangs, `strace -p [pid]` tells you what it's blocked on. This is a powerful debugging tool.
- Kernel module basics (what `lsmod` shows, why you might need to `modprobe` something).

**Diminishing returns:**
- Kernel compilation. LFS teaches this, and the conceptual understanding is valuable, but you will never need to compile a custom kernel for agent workloads.
- Writing kernel modules.
- Kernel debugging (kgdb, ftrace, eBPF for tracing). eBPF is genuinely useful for observability at scale but is an advanced topic with steep learning curve.

**ROI curve:** Moderate rise to conceptual understanding, then flat. The homelab's LFS phase provides exactly the right level of kernel understanding. Budget: LFS itself covers this adequately.

### Containers (how Docker actually works)

**Depth required: deep**

This is the most directly relevant domain for agent swarm management. Your agents live in containers. Understanding what containers actually are (not just how to use them) is the difference between operating confidently and operating on hope.

**High-leverage knowledge:**
- Containers are namespaces + cgroups + overlayfs. Not VMs. They share the host kernel. This is the foundational mental model.
- Image layers and caching. Why changing one line in your Dockerfile rebuilds everything below it. Why multi-stage builds reduce image size. When your agent image is 2GB and takes 5 minutes to build, understanding layers lets you cut it to 200MB and 30 seconds.
- Resource limits (memory, CPU, PIDs). On a mini PC with 16GB RAM running 5-10 agent containers, resource limits are the difference between stable operation and cascading OOM kills.
- Container networking (bridge, host, none, overlay). How agents in separate containers communicate. How they reach the internet. How you expose services.

**Worth knowing:**
- Security: running as non-root inside containers, dropping capabilities, read-only root filesystem, seccomp profiles. An agent container that can't write outside its working directory and can't make arbitrary syscalls is significantly harder to weaponise via prompt injection.
- Health checks and restart policies. Docker's `HEALTHCHECK` instruction and `--restart=unless-stopped` give you self-healing agent containers.
- Docker Compose for multi-container agent setups. Define your agent swarm declaratively, bring it up with one command.

**Diminishing returns:**
- Container runtime internals (runc, containerd, shim processes). Unless you're debugging container startup failures at the runtime level.
- Building custom container runtimes.
- OCI spec details.

**ROI curve:** Steeply and continuously high. Containers are the primary deployment unit for agents, so understanding them deeply pays continuous dividends. Budget: 1 week focused study, then learn through building and debugging.

### Storage

**Depth required: shallow-to-moderate**

**High-leverage knowledge:**
- Understanding what happens when a container is destroyed: the writable layer is gone. Volumes persist. This determines where agents should store durable state.
- Volume mounts (bind mounts vs named volumes). How agents access shared data, how you inject configuration, how you extract results.
- Disk space monitoring (`df`, `du`). Agent containers that write logs or intermediate files can fill a 256GB SSD faster than expected.

**Worth knowing:**
- LVM basics (extending volumes, snapshots). Useful on the homelab nodes for managing storage.
- Distributed storage concepts (Longhorn, Ceph). When agents need shared persistent storage across a cluster.

**Diminishing returns:**
- RAID configuration and management (the homelab nodes are single-SSD, and distributed storage handles redundancy at the software layer).
- Filesystem internals (ext4 journal, XFS allocation groups).
- SAN/NAS administration.

**ROI curve:** Moderate rise through volumes and mounts, then flat. Budget: 1 day, plus hands-on with Longhorn during homelab setup.

### Security

**Depth required: moderate-to-deep**

Agents with tool use are an unprecedented security surface. They can execute arbitrary commands, make network requests, and read files. Securing them is not optional.

**High-leverage knowledge:**
- Linux capabilities (what CAP_NET_ADMIN, CAP_SYS_ADMIN, CAP_DAC_OVERRIDE grant). Dropping all capabilities except what the agent actually needs is the container equivalent of least privilege.
- Seccomp profiles (restricting which syscalls a container can make). An agent that can't call `mount`, `reboot`, or `ptrace` is significantly safer.
- User namespaces (running containers as non-root, mapping container root to an unprivileged host user). This is the strongest isolation mechanism available without VMs.

**Worth knowing:**
- AppArmor/SELinux profiles for containers. Mandatory access control that limits what containerised agents can access even if they escape their namespace.
- Audit logging (`auditd`). When you need to know what an agent actually did on the host.
- Network segmentation for agent containers (separate networks for agents that shouldn't communicate).

**Diminishing returns:**
- Writing custom SELinux policies from scratch (use the Docker/container defaults and extend).
- Kernel hardening (grsecurity, PaX). Useful for high-security environments, excessive for a homelab agent swarm.
- Penetration testing expertise (unless security is your primary role).

**ROI curve:** Moderate rise through capabilities and seccomp, sustained return through MAC policies, then diminishing. Budget: 2-3 days focused study, with ongoing refinement as you discover what your agents actually need access to.

### Systemd

**Depth required: shallow-to-moderate**

**High-leverage knowledge:**
- Unit files (service, timer, socket). If you run agents as systemd services (on bare metal nodes), you need to write unit files that define start, stop, restart, and dependency behaviour.
- `journalctl` for log inspection. Agent processes logging to stdout are captured by journald. `journalctl -u agent-swarm.service --since "10 minutes ago"` is how you debug recent failures.
- Timers as cron replacement. Scheduling agent dispatches on a recurring basis.

**Worth knowing:**
- Socket activation (start a service only when a connection arrives). Useful for agent services that should be on-demand.
- Resource control directives in unit files (`MemoryMax`, `CPUQuota`). An alternative to cgroup limits when running on bare metal.

**Diminishing returns:**
- Systemd internals (dbus, sd-bus, the journal binary format).
- Writing generators.
- The systemd-vs-init debate (this is a distro community concern, not an engineering one).

**ROI curve:** Moderate rise to basic unit files and journalctl, then flat. Budget: half a day, then learn specifics as needed.

---

## 3. The Homelab as Agent Infrastructure Training

The conceptual link between the homelab curriculum and the midget swarm approach is not metaphorical. The homelab is training infrastructure for the same class of problems agent orchestration presents.

### Kubernetes from scratch maps to agent container orchestration

Kubernetes the Hard Way teaches you what `k3s` automates: TLS certificate bootstrapping, etcd cluster setup, kubelet configuration, CNI plugin installation, kube-proxy rules. When you deploy agents as k8s pods, every failure you encounter during the Hard Way exercise maps to a failure you'll eventually encounter in production:

- Certificate expiry breaks pod-to-API communication → agent containers can't pull instructions
- etcd quorum loss prevents scheduling → agent dispatch fails silently
- CNI misconfiguration breaks pod-to-pod networking → agents can't coordinate
- kubelet resource reporting errors → agents scheduled on nodes without capacity

The specific leverage: when your agent pod enters CrashLoopBackOff, someone who did Kubernetes the Hard Way checks the kubelet logs, the container runtime logs, and the pod events. Someone who only used managed k8s opens the Lens GUI and stares at a red icon.

### Linux From Scratch prepares you for custom agent container images

LFS builds a complete Linux system from source: toolchain (gcc, binutils, glibc), core utilities, init system, package by package. This exercise teaches:

- What a minimal Linux system actually needs. An agent container image doesn't need man pages, locales, documentation, or a desktop environment. LFS teaches you exactly which packages are load-bearing and which are optional. This directly translates to minimal container images: smaller images mean faster pulls, smaller attack surface, and more agents per node.
- How shared libraries work. When your agent container fails with "error while loading shared libraries: libfoo.so.6: cannot open shared object file," someone who did LFS knows this is a dynamic linker issue and checks `ldd`, `LD_LIBRARY_PATH`, and whether the library was installed to the right prefix. Someone who didn't copies a random solution from Stack Overflow.
- The build toolchain. Multi-stage Docker builds use the same pattern as LFS: build in one environment, copy only the outputs to the final image. LFS teaches you to think about build dependencies vs runtime dependencies — the same distinction that makes multi-stage builds effective.

### Chaos engineering transfers to agent reliability engineering

Killing nodes, partitioning networks, and exhausting resources on the homelab directly maps to agent failure scenarios:

- **Kill a node** → What happens to the agents running on it? Are they rescheduled? Is their state recoverable? If they were mid-task, is the task idempotent enough to retry safely?
- **Network partition** → What happens when half your agent swarm can't reach the API? Do they queue work? Do they fail? Do they continue operating on stale instructions?
- **Resource exhaustion** → What happens when a node runs out of memory? Which agents get killed? The OOM killer's heuristics (kill the process using the most memory) may not align with your priority model (kill the lowest-priority agent, not the one doing the most important work).

The specific leverage: chaos engineering builds intuition for failure modes. After you've deliberately killed a node and watched the cascading effects three times, you design your agent system differently. You add health checks, you implement graceful shutdown handlers, you make tasks idempotent, you store checkpoints. These design decisions come from experiencing the failures, not from reading about them.

### Heterogeneous distros map to operating agents across environments

Running Debian, Arch, and Ubuntu on the same cluster forces you to handle package naming differences (`python3-dev` vs `python-dev`, `libssl-dev` vs `openssl`), init system variations (even within systemd, default configurations differ), and filesystem layout differences. This maps directly to:

- Building agent containers that work on any base image. If your Dockerfile only works on `ubuntu:24.04`, you can't switch to `alpine` for smaller images or `debian:bookworm-slim` for a different dependency graph.
- Understanding that "it works on Arch" doesn't mean it works on Debian. Agent containers deployed across nodes with different host kernels and configurations may behave differently due to kernel version differences, filesystem mount options, or cgroup configuration.
- Developing the reflex to test across environments rather than assuming homogeneity.

### Networking, resource constraints, and failure modes

The homelab's physical constraints are an advantage, not a limitation:

- **16GB RAM per node** means you learn resource management under real pressure. On an AWS instance, you scale up. On a mini PC, you optimise. Running 5-10 agent containers on 16GB teaches you to set memory limits, monitor usage, and handle OOM kills — lessons that transfer directly to running agents cost-efficiently on cloud infrastructure.
- **2.5GbE networking** is fast but not infinite. When 10 agents simultaneously pull large model artifacts or container images, you hit bandwidth limits. This teaches network-aware scheduling and caching strategies (local image registries, artifact caching proxies).
- **256GB SSDs** fill up. Agent containers that write logs, intermediate files, and model artifacts consume storage. The homelab teaches you to monitor disk usage, implement rotation, and clean up — skills that prevent the "disk full, all agents down" scenario.
- **Physical failures happen.** A power supply fails, a SSD develops bad sectors, a node overheats under sustained load. These are real failure modes that cloud infrastructure hides from you but that still exist underneath the abstraction. Experiencing them builds the paranoia that produces resilient system design.

---

## 4. The New Learning Stack: A Curriculum for Commanders of Compute

This is not a Linux sysadmin curriculum, a software engineering bootcamp, or a DevOps certification path. It's a training sequence for people whose primary job is directing agent swarms on Linux infrastructure. Each phase builds on the previous one, and the phases are ordered by dependency (you can't do Phase 3 without Phase 2).

### Phase 0: The Foundation (2-3 weeks)

**Goal:** Operate a Linux machine fluently from the terminal. No GUI as a crutch.

**Activities:**
- Install Arch Linux manually (no archinstall). The Arch install process teaches partition tables, filesystems, bootloaders, network configuration, package management, and user creation — all from the command line. Every concept is encountered because you need it, not because a textbook says so.
- Complete OverTheWire Bandit (34 levels). This teaches: SSH, file manipulation, permissions, basic scripting, `find`/`grep`/`sort`/`uniq`, process management, networking basics, all through progressively harder puzzles.
- Set up a development environment entirely from the terminal: `git`, a text editor (neovim or similar), a programming language (Python via `uv`), `tmux` for session management.

**Exit criteria:** Can SSH into a remote machine, navigate the filesystem, edit files, manage processes, install packages, write basic shell scripts, and use git — without reaching for a GUI.

**Why this comes first:** Everything else depends on this. You cannot command agents that operate Linux machines if you can't operate a Linux machine yourself. The failure mode is not "slightly less efficient" — it's "unable to verify agent output, diagnose failures, or design correct instructions."

### Phase 1: Containerisation and Agent Deployment (2 weeks)

**Goal:** Deploy and manage agent processes in containers. Understand isolation, resource limits, and networking.

**Activities:**
- Build the midget swarm container from scratch. Write the Dockerfile, install Xvfb, fluxbox, xdotool, scrot. Understand each component and why it's needed.
- Run 5 agent containers simultaneously on a single machine. Set memory and CPU limits. Monitor resource usage. Observe what happens when one container exceeds its limits.
- Configure container networking: agents that can communicate with each other, agents that are isolated, agents that can reach external APIs but not each other.
- Implement health checks and restart policies. Kill containers mid-task and verify they recover correctly.
- Write a docker-compose file that defines a complete agent swarm with shared volumes, network segmentation, and resource limits.

**Exit criteria:** Can deploy N agent containers with controlled resource limits, networking, and health monitoring. Can diagnose and resolve container failures from logs and inspection.

**Why this order:** Containers before orchestration. You need to understand the unit (a container) before managing many of them. Attempting Kubernetes without understanding containers produces "works by copy-pasting YAML" expertise that collapses on first contact with a real problem.

### Phase 2: Verification Engineering (2 weeks)

**Goal:** Build the systems that tell you whether agent output is correct. This is where the gate comes from.

**Activities:**
- Write a test suite for a small project. Not the project itself — the tests. Have agents implement the project to pass your tests. Observe where agent-written code passes tests but is structurally wrong ("right answer, wrong work").
- Build a CI pipeline (GitHub Actions or local) that runs typecheck, lint, and tests. Make the rule absolute: agent output is not accepted unless the gate is green.
- Design verification strategies for non-code output: how do you verify that an agent-written document meets requirements? How do you verify that an agent-configured infrastructure is correct? These are specification and assertion problems.
- Practice writing specifications precise enough that agent output can be verified against them. Start vague ("make a login page"), observe the failures, iterate toward precision ("a form with email and password fields, client-side validation per RFC 5322 for email, minimum 8 characters for password, POST to /api/auth/login, display API error messages inline").

**Exit criteria:** Can write test suites that catch semantic errors (not just syntax), can build and maintain CI/CD gates, can write specifications precise enough for machine verification.

**Why this matters:** Without verification engineering, the agentic workflow degenerates into "generate and manually review," which is slower than doing the work yourself. The gate is the force multiplier. Everything this curriculum teaches about agents is wasted if you can't verify their output.

### Phase 3: Infrastructure from Scratch (3-4 weeks)

**Goal:** Understand the infrastructure layer deeply enough to operate agent swarms on bare metal and in the cloud.

**Activities:**
- Linux From Scratch: build a complete Linux system from source. This teaches the minimum viable system, shared libraries, the build toolchain, and filesystem hierarchy at a level of detail that permanently changes how you think about container images and system dependencies.
- Kubernetes the Hard Way: build a k8s cluster manually. Then install k3s and understand what it automated.
- Build the homelab cluster: 6 nodes, mixed distros, k3s, storage (Longhorn), networking (Cilium), monitoring (Prometheus/Grafana).
- Deploy agent containers on the cluster. Implement scheduling policies (which agents run where), resource quotas (per-namespace limits), and pod disruption budgets (how many agents can be down simultaneously).

**Exit criteria:** Can build and operate a multi-node cluster running containerised agent workloads with monitoring, storage, and networking. Can explain what happens at each layer when an agent container starts, runs, and is terminated.

**Why from scratch:** The point is not to build production infrastructure by hand forever. The point is to understand what managed services and tools like k3s automate, so that when they fail — and they will — you can diagnose the problem instead of staring at an opaque error. LFS graduates who use `k3s` in production understand why it works. Non-LFS graduates who use `k3s` in production only know that it works, until it doesn't.

### Phase 4: Operational Training and Convention Development (ongoing)

**Goal:** Develop the governance system — the conventions, protocols, and operational patterns that make agent swarms reliable over time.

**Activities:**
- Develop agent role files (like the crew roster in AGENTS.md). Define what each agent is responsible for, what context it receives, what output it produces, and what verification gates its output must pass.
- Build the polecat dispatch system: one-shot agents dispatched with a plan file, producing durable output, verified by the gate. Iterate on the plan file format based on what produces good output and what doesn't.
- Develop the anti-pattern taxonomy for your specific context. The slopodar is this project's taxonomy. Yours will have different patterns. The methodology is: when you catch an agent doing something wrong, name it, document it, and add it to your detection heuristics.
- Practice the human review cadence. Determine when you review in real-time (taste decisions, architectural choices) vs when you review after execution (implementation, boilerplate, test writing). Get the balance wrong deliberately and learn where the failure modes are.
- Build the "taste boundary" checklist for your domain: which outputs require your human judgment, and which can be accepted on gate-pass alone?

**Exit criteria:** There is no exit. This is the ongoing practice of agentic engineering. The conventions compound over time. You're learning what works for your specific context, agents, and workloads.

**Why this is Phase 4:** You need all the previous phases to do this well. Governance without infrastructure understanding produces "paper guardrails." Infrastructure without verification produces uncontrolled agents. Verification without CLI fluency produces gates you can't debug. The ordering is load-bearing.

### Phase 5: Scaling and Resilience (2-3 weeks, after Phase 3 is operational)

**Goal:** Operate agent swarms at scale under adversarial conditions.

**Activities:**
- Chaos engineering on the homelab: kill nodes, partition networks, exhaust resources, corrupt storage. For each failure mode, document what happened to the agent workload and what controls would prevent or mitigate it.
- Implement auto-scaling: add and remove agent containers based on workload. Understand the cold-start cost (how long does it take to pull the image and start the container?) and the warm-pool strategy (keep idle containers ready).
- Practice incident response: an agent swarm is producing incorrect output. How do you detect it? How do you stop it? How do you diagnose the root cause? How do you prevent recurrence? This is the agent equivalent of an SRE playbook.
- Implement distributed task coordination: how agents claim work, report progress, handle failures, and avoid duplication. This is a distributed systems problem and requires understanding locks, queues, and idempotency.

**Exit criteria:** Can operate an agent swarm under failure conditions without data loss or uncontrolled behaviour. Can diagnose and resolve failures using monitoring, logs, and infrastructure inspection.

---

## 5. What the Homelab Gets Right and What It Should Add

### Already there and maps perfectly

**Arch manual install (Phase 0 of both curricula).** The Arch install process is the single best exercise for Linux fluency. Every decision is yours, every component is visible, every error is educational. This maps directly to Phase 0 of the commander curriculum.

**OverTheWire Bandit.** CLI fluency through progressively harder challenges. The later levels (networking, cryptography, process management) are directly relevant to agent operations and debugging.

**Linux From Scratch.** Builds the mental model of "what is a Linux system, actually" that makes container image optimisation and debugging possible. The specific leverage for agent engineering: after LFS, you'll never build a 2GB agent container image again, because you know exactly which 50MB of that image is actually needed.

**Kubernetes the Hard Way.** Understanding what k3s automates. When agent pods fail to schedule, can't communicate, or lose storage, the Hard Way graduate knows where to look. The managed-k8s user files a support ticket.

**k3s cluster bootstrap on heterogeneous nodes.** Mixed distros force you to handle real-world variance. Agent containers deployed across different nodes will encounter the same variance.

**Production patterns (Longhorn, Cilium, Prometheus/Grafana, ArgoCD).** Storage, networking, monitoring, and GitOps are all directly relevant to agent swarm management. Prometheus/Grafana for monitoring agent resource usage. Longhorn for agent persistent storage. Cilium for agent network policies. ArgoCD for deploying agent configurations via git.

**Chaos engineering.** Maps directly to agent reliability engineering. The homelab's advantage is that failures on physical hardware are more visceral and educational than failures in the cloud, where a replacement node appears in seconds and you never learn what broke.

### Missing and should be added

**Container security hardening module (add between Week 5 and Week 6)**

The homelab curriculum jumps from cluster bootstrap to production patterns without a focused security phase. For agent workloads, security is not a "production pattern" — it's a prerequisite. Add:

- Build an agent container with dropping capabilities, seccomp profiles, non-root execution, read-only root filesystem. Deploy it to the cluster.
- Write a Kubernetes NetworkPolicy that limits agent-to-agent communication to only the connections that are necessary.
- Demonstrate a simulated prompt injection that escapes a poorly-configured container (mount the host filesystem, exfiltrate a secret). Then demonstrate the same attack failing against a hardened container.
- Implement Pod Security Standards (restricted profile) for the agent namespace.

Why it's missing and matters: the homelab was designed for infrastructure learning. Agent containers introduce an active security concern that traditional workloads don't have — the agent can be instructed to do things by adversarial input, and the container configuration determines what it's capable of doing.

**Agent container image optimisation module (add during or after LFS)**

LFS teaches what a minimal Linux system is. Add a bridge exercise:

- After completing LFS, build a minimal Docker base image. Start from `scratch` or `alpine`, add only what an agent needs (bash, coreutils, Python, the specific tools for the agent's task).
- Benchmark: how small can you make an agent container that can run CLI tools, execute Python scripts, and make HTTP requests? Target: under 100MB.
- Compare image pull times across the cluster. When you're deploying 10 agent containers to 6 nodes simultaneously, image size determines startup latency.

Why it's missing and matters: LFS builds the mental model; this exercise applies it to the agent deployment context. The connection exists but isn't made explicit in the curriculum.

**Verification engineering module (add as a parallel track during Weeks 3-5)**

The homelab curriculum is infrastructure-focused. It doesn't cover the verification side: how do you know the infrastructure is correct? How do you know agent output is correct? Add:

- Write infrastructure tests (Terratest, bats, or plain bash scripts that verify cluster state). "All nodes are Ready. CoreDNS is running. Longhorn volumes are healthy." These are the infrastructure equivalent of the gate.
- Build a monitoring dashboard specifically for agent workloads: container restarts, OOM kills, error rates, task completion rates, resource utilisation per agent type.
- Write a chaos engineering framework that automatically checks for correct recovery (not just that the system eventually recovers, but that it recovers correctly — no data corruption, no stale state, no duplicated work).

Why it's missing and matters: infrastructure without verification is infrastructure you hope works. The homelab curriculum tests learning by building, but doesn't formalise verification. Adding it creates the habit of "how do I know this is correct?" that transfers to all agent operations.

**Agent orchestration module (add after Week 7, as a capstone)**

The homelab curriculum ends with chaos engineering on infrastructure. Add a capstone that uses the infrastructure to run actual agent workloads:

- Deploy 10 midget swarm containers across the cluster. Assign them tasks (web scraping, document processing, code generation). Monitor execution, collect results, verify output.
- Implement a task queue (Redis, RabbitMQ, or a filesystem-based queue) that distributes work to agents. Handle agent failures by requeueing.
- Build the dispatch pipeline: write a plan file, dispatch an agent container with the plan as context, collect output, run verification gates, report results. This is the full polecat lifecycle on real infrastructure.
- Measure throughput: how many agent tasks can the cluster process per hour? What's the bottleneck (CPU, memory, network, API rate limits)?

Why it's missing and matters: this connects the homelab (infrastructure) to the midget swarm (agent runtime). Without this module, the homelab teaches infrastructure and the midget swarm teaches agent containers, but the connection between them remains conceptual rather than practiced.

**Networking lab for agent communication (add within Week 6)**

The homelab covers Cilium CNI, but doesn't specifically address agent-to-agent communication patterns:

- Implement service discovery for agents: agent A needs to find agent B. Use Kubernetes Services, DNS, or a simple registry.
- Implement agent-to-human communication: how agents report status, request taste decisions, and surface alerts. This is the operational interface between the agent swarm and the commander.
- Simulate network degradation (latency, packet loss) between nodes and observe agent behaviour. Agents that retry with exponential backoff are resilient; agents that crash on first timeout are not.

Why it's missing and matters: multi-agent systems have communication requirements that single-service deployments don't. The homelab's networking coverage is general-purpose; agent-specific communication patterns need dedicated practice.

---

## Provenance

This analysis was produced as a single-pass drafting polecat with the full agent-native software taxonomy, the slopodar, and the AGENTS.md as context. All claims about ROI curves and diminishing returns reflect engineering judgment applied to the specific context of commanding agent swarms on Linux infrastructure. The priority matrix is opinionated — different contexts (pure cloud, Windows environment, non-technical orchestrators) would produce different orderings.
