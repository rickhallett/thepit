import pandas as pd
import numpy as np
import yaml
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneOut
from sklearn.metrics import accuracy_score

# Load data
df = pd.read_csv("calibration-data-v3.tsv", sep="\t")

# The 11 features from the prompt
features = [
    "contractionPer1k",
    "firstPersonPer1k",
    "questionRate",
    "transitionPer1k",
    "nomDensity",
    "emdashPer1k",
    "absnoun",
    "epigramPer1k",
    "isocolonPer1k",
    "antithesisPer1k",
    "anadipPer1k",
]

# Filter to just A and C for the LR model
df_ac = df[df["cat"].isin(["A-human-pre", "C-ai-co"])].copy()
X = df_ac[features].values
y = (df_ac["cat"] == "A-human-pre").astype(int).values


def get_loo_accuracy(X, y):
    loo = LeaveOneOut()
    preds = []
    for train_idx, test_idx in loo.split(X):
        if len(np.unique(y[train_idx])) < 2:
            preds.append(y[test_idx][0])  # Predict whatever
            continue
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X[train_idx], y[train_idx])
        preds.append(model.predict(X[test_idx])[0])
    return accuracy_score(y, preds)


base_acc = get_loo_accuracy(X, y)

results = {
    "base_accuracy": float(base_acc),
    "task_2a_fragility": {},
    "task_2b_min_flips": 0,
    "task_2c_ablation": {},
}

# 2a. Leave-One-Out Fragility
cat_a_indices = np.where(y == 1)[0]
for idx in cat_a_indices:
    mask = np.ones(len(X), dtype=bool)
    mask[idx] = False
    acc = get_loo_accuracy(X[mask], y[mask])
    sample_label = df_ac.iloc[idx]["label"]
    results["task_2a_fragility"][sample_label] = float(acc)

# 2b. Boundary Manipulation
df_ac["sum_score"] = (
    df_ac["contractionPer1k"] + df_ac["firstPersonPer1k"] + df_ac["questionRate"]
) - (df_ac["transitionPer1k"] + df_ac["nomDensity"])
cat_a_indices_sorted = (
    df_ac[df_ac["cat"] == "A-human-pre"].sort_values("sum_score").index
)
pos_indices = [df_ac.index.get_loc(idx) for idx in cat_a_indices_sorted]

for i in range(1, len(pos_indices) + 1):
    y_mod = y.copy()
    y_mod[pos_indices[:i]] = 0
    acc = get_loo_accuracy(X, y_mod)
    if acc < 0.60:
        results["task_2b_min_flips"] = i
        break

# 2c. Feature Ablation
for i, feat in enumerate(features):
    mask = np.ones(X.shape[1], dtype=bool)
    mask[i] = False
    acc = get_loo_accuracy(X[:, mask], y)
    results["task_2c_ablation"][feat] = float(acc)

# 2d. Synthetic Injection
X_syn = []
y_syn = []
np.random.seed(42)
for _ in range(5):
    vec = np.mean(X[y == 0], axis=0)
    X_syn.append(vec)
    y_syn.append(1)

    vec = np.mean(X[y == 1], axis=0)
    X_syn.append(vec)
    y_syn.append(0)

X_aug = np.vstack([X, X_syn])
y_aug = np.concatenate([y, y_syn])
aug_acc = get_loo_accuracy(X_aug, y_aug)
results["task_2d_synthetic_accuracy"] = float(aug_acc)

with open("dagger-1-adversarial-data.yaml", "w") as f:
    yaml.dump(results, f, default_flow_style=False)
