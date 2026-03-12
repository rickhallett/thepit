# Bootcamp I - Competency Assessment

**Date:** 2026-03-10
**Context:** Where does completing Bootcamp I place you on established competency scales?

---

## Against CompTIA Linux+ (XK0-005)

CompTIA Linux+ tests breadth of system administration: install packages, configure
networking, manage users, set permissions, write basic shell scripts, understand SELinux,
configure GRUB, set up NFS, manage LVM, troubleshoot boot issues. It is a mile wide and
an inch deep.

Bootcamp I is the inverse: narrow scope (processes, shell, filesystem, text tools, git,
containers, observation) but deep enough to reason at the kernel level. You understand
WHY `pipe()` creates two file descriptors, not just THAT `|` connects commands.

**Overlap:** ~60%. Both cover process management, file permissions, shell scripting,
networking basics, systemd, cron. Bootcamp I covers these at greater depth (syscall-level
understanding vs "use the command").

**Gaps:** Bootcamp I does not cover: package management, boot process (GRUB, initramfs
in detail), NFS/CIFS, LDAP/PAM, SELinux/AppArmor configuration, LVM administration,
RAID, X11/Wayland display server configuration, accessibility, localization. These are
sysadmin topics the bootcamp deliberately skips because agents handle them and they do
not compose upward into the agentic engineering stack.

**Net assessment:** After Bootcamp I with intensity, you would pass Linux+ on process
management, shell scripting, filesystem, networking fundamentals, and containerization
sections. You would fail sections on storage management, authentication/authorization
services, and some hardware/boot topics. You would score deeper than Linux+ expects on
the topics you covered.

---

## How Employers Pencil You

| Category | Where you land | What they would see |
|----------|---------------|---------------------|
| Junior SWE who "knows Linux" | Well above | They `cd` and `ls`. You understand fork/exec. Different universe. |
| Mid SWE "comfortable on Linux" | Above | They use Docker without understanding namespaces. They write shell scripts without understanding quoting. You see through the abstractions. |
| Senior SWE with Linux experience | Competitive | They have been using strace and reading /proc for years. You have the same mental model but less time-in-seat. They would respect the depth, note the lack of war stories. |
| CompTIA Linux+ | Deeper but narrower | You go below their floor on covered topics. You have gaps on their breadth topics. |
| RHCSA (Red Hat Certified Sysadmin) | Below in scope | RHCSA is practical and broader - storage, SELinux, firewalld, NFS, LDAP, Ansible. More sysadmin breadth. But RHCSA does not touch process observation at the strace level or container internals at the namespace level. |
| RHCE (Red Hat Certified Engineer) | Well below in scope | RHCE adds Ansible automation, complex networking, Kerberos, iSCSI. Deep enterprise sysadmin. Different career track. |
| LFCS (Linux Foundation Certified Sysadmin) | Comparable depth, narrower | LFCS is the closest peer to Bootcamp I's depth on fundamentals. |
| Kernel developer / systems programmer | Below | They read kernel source. They write kernel modules. They understand the scheduler. Different altitude entirely. |

---

## Relative to the Average SWE

The average SWE in 2026:

- Uses Linux casually (WSL, Docker, cloud VMs)
- Can write basic shell scripts (with quoting bugs they do not know about)
- Uses git porcelain commands, has never seen `git cat-file`
- Knows Docker commands, does not know what a namespace is
- Has never used strace
- Does not know what a file descriptor is
- Thinks pipes are syntax, not kernel objects

After Bootcamp I with intensity, you are in the **top 10-15% of SWEs** on Linux
substrate knowledge. Not top 5% - that is people with years of systems engineering
experience. But solidly above the vast majority who treat Linux as an opaque platform
they happen to deploy on.

More importantly: you would be in a unique position because this knowledge is
specifically aimed at a need that barely existed 2 years ago (governing agent output
at the system level). The average SWE with equivalent Linux depth does not have the
agentic engineering frame. The average agentic engineer does not have the Linux depth.
The intersection is small.

---

## The Honest Limitation

Knowledge without mileage is fragile. The bootcamp gives you the mental models.
Production experience stress-tests them. When you have diagnosed your 50th broken
pipeline at 2am, the concepts become reflexes. The bootcamp gets you from "cannot
diagnose" to "can diagnose with effort." Time-in-seat gets you to "diagnoses on reflex."

---

## Certification Depth Comparison (Visual)

```
Depth on covered topics (deeper = more)

Kernel dev         ████████████████████████████████████████  (reads kernel source)
Bootcamp I         ██████████████████████████████           (syscall-level mental model)
LFCS               █████████████████████████                (solid fundamentals)
RHCSA              ████████████████████                     (practical breadth)
Linux+             ███████████████                          (surface coverage)
Average SWE        ████████                                 (casual user)

Breadth of topics (wider = more)

RHCE               ████████████████████████████████████████
RHCSA              ██████████████████████████████████
Linux+             ████████████████████████████
LFCS               ██████████████████████████
Bootcamp I         ██████████████████                       (deliberately narrow)
Average SWE        ██████████                               (whatever they needed)
```

The trade-off is intentional. Bootcamp I optimizes for compositional depth on the
specific substrate that agentic engineering requires, not for breadth across system
administration. The gaps (LVM, SELinux, NFS, LDAP) are topics where an agent can
compensate for operator ignorance. The depth topics (process model, shell semantics,
container internals, process observation) are where ignorance creates oracle problems
that no agent can catch.
