# /// script
# requires-python = ">=3.11"
# ///
"""Generate a 6-week interview prep ICS calendar.

Usage: uv run scripts/gen-interview-cal.py > interview-prep.ics
"""

from datetime import datetime, timedelta
import uuid
import sys

# --------------------------------------------------------------------------- #
# Schedule config
# --------------------------------------------------------------------------- #

START_DATE = datetime(2026, 3, 14)  # Saturday - setup day
FIRST_MONDAY = datetime(2026, 3, 16)
WEEKS = 6
TZ = "Europe/London"

PHASES = [
    {"name": "Foundation", "weeks": [1, 2]},
    {"name": "Ramp", "weeks": [3, 4]},
    {"name": "Integration", "weeks": [5, 6]},
]

CC_PROJECTS = {
    1: "Build-your-own Redis",
    2: "Build-your-own Redis",
    3: "Build-your-own HTTP Server",
    4: "Build-your-own HTTP Server",
    5: "Build-your-own Docker",
    6: "Build-your-own Docker",
}

NC_DESIGN_TOPICS = {
    1: "NeetCode System Design: intro, client-server, networking basics, proxies, load balancers",
    2: "NeetCode System Design: caching, CDNs, hashing, databases (SQL vs NoSQL)",
    3: "NeetCode System Design: replication, sharding, CAP theorem, message queues",
    4: "NeetCode System Design: design URL shortener, design pastebin, design Twitter feed",
    5: "Practice: design a chat system from scratch on paper, out loud, 35 min timed",
    6: "Practice: design a rate limiter + notification system, out loud, 35 min timed",
}

NC_ALGO_DESC = {
    "Foundation": (
        "Easy tier. 2-3 problems. No AI, no autocomplete, no copilot.\n\n"
        "Talk through your approach out loud as you solve.\n"
        "Target: 10-15 min per problem.\n"
        "If finished early, do one more.\n"
        "If stuck after 15 min, read the NeetCode video solution, "
        "understand it, then solve it again from scratch tomorrow.\n\n"
        "Focus areas: arrays, hash maps, two pointers, stacks."
    ),
    "Ramp": (
        "Medium tier. 2-3 problems. No AI, no autocomplete.\n\n"
        "Target: 20-25 min per problem.\n"
        "Talk out loud - narrate your thinking.\n"
        "Focus areas: sliding window, linked lists, trees, binary search, "
        "heap/priority queue.\n\n"
        "If a pattern is unfamiliar, watch the NeetCode explanation first, "
        "then solve 2 problems of that pattern before moving on."
    ),
    "Integration": (
        "Medium tier. TIMED - 20 min hard cap per problem.\n\n"
        "If you don't solve it in 20 min, stop, read solution, move on. "
        "This simulates interview pressure.\n"
        "Talk out loud throughout - this is interview simulation.\n"
        "Focus areas: graphs, dynamic programming, backtracking, intervals.\n\n"
        "After solving, ask: could I explain this solution clearly to an "
        "interviewer? If not, practice the explanation."
    ),
}

CC_DESC = {
    "Build-your-own Redis": (
        "Codecrafters: Build-your-own Redis.\n\n"
        "Work through stages sequentially. No AI. No copilot.\n"
        "Focus on understanding the protocol, data structures, persistence.\n"
        "This rebuilds manual coding stamina and gives you a real system "
        "to discuss in design interviews.\n\n"
        "Key concepts: TCP server, RESP protocol parsing, hash maps, "
        "key expiry/TTL, persistence (RDB snapshots)."
    ),
    "Build-your-own HTTP Server": (
        "Codecrafters: Build-your-own HTTP Server.\n\n"
        "Request parsing, routing, concurrent connections, compression.\n"
        "No AI. No copilot.\n"
        "This is foundational for any web engineering role.\n\n"
        "Key concepts: TCP sockets, HTTP/1.1 parsing, content negotiation, "
        "gzip compression, concurrent request handling."
    ),
    "Build-your-own Docker": (
        "Codecrafters: Build-your-own Docker.\n\n"
        "Linux namespaces, chroot, process isolation.\n"
        "No AI. No copilot.\n"
        "Strong differentiator in interviews - connects to your "
        "container/midgets work.\n\n"
        "Key concepts: chroot, PID namespaces, filesystem isolation, "
        "image layers, registry interaction."
    ),
}

BLOCK4_BY_DOW = {
    0: (  # Monday
        "Review + Reinforce",
        "Review any NeetCode problems you struggled with last session.\n"
        "Solve them again from scratch without looking at the solution.\n"
        "If you solve them cleanly, the pattern has landed.\n"
        "If you struggle again, add that pattern to tomorrow's focus.",
    ),
    1: (  # Tuesday
        "Explain Codecrafters Out Loud",
        "Take the Codecrafters stages you completed this week.\n"
        "Stand up. Draw the architecture on paper or whiteboard.\n"
        "Explain what each component does and why, as if to an interviewer.\n"
        "Time yourself - aim for 10 min per subsystem.\n"
        "Practice the phrase: 'I chose X because Y, the trade-off is Z.'",
    ),
    2: (  # Wednesday
        "Design The Pit on Paper",
        "Pick a subsystem of The Pit you built. Draw it from memory.\n"
        "No code, no repo, no AI. Paper and pen only.\n\n"
        "Week 1: SSE streaming + bout engine\n"
        "Week 2: Credit system + Stripe integration\n"
        "Week 3: BYOK key lifecycle + model routing\n"
        "Week 4: Agent creation + DNA fingerprinting + attestation\n"
        "Week 5: Rate limiting + API design\n"
        "Week 6: Full system - draw the whole thing, 35 min\n\n"
        "Talk through trade-offs out loud as you draw.",
    ),
    3: (  # Thursday
        "Mock Interview Simulation",
        "Full simulation. Set a timer.\n\n"
        "Weeks 1-2: Pick 1 medium NeetCode problem. 25 min. "
        "Talk out loud as if someone is watching. "
        "Then pick 1 easy system design question and talk through it for 15 min.\n\n"
        "Weeks 3-4: 1 medium problem (20 min cap) + 1 system design (20 min). "
        "Record yourself if possible. Watch it back.\n\n"
        "Weeks 5-6: Use Interviewing.io or Pramp for a real mock with a stranger. "
        "If unavailable, full 45 min simulation: 5 min clarify, 25 min code, "
        "15 min system design.",
    ),
    4: (  # Friday
        "Week Review + Plan",
        "Review the week honestly.\n\n"
        "- How many NeetCode problems solved? Which patterns are strong/weak?\n"
        "- Codecrafters: how many stages completed? Anything blocked?\n"
        "- System design: can you draw and explain this week's topics cold?\n"
        "- What was the hardest moment this week? What would you do differently?\n\n"
        "Write 3-5 bullet points in a notebook. Not for anyone else - for you.\n"
        "Plan next week: which NeetCode patterns to focus on, "
        "which Codecrafters stages to target.\n\n"
        "Then stop. You are done for the week.",
    ),
}


# --------------------------------------------------------------------------- #
# ICS helpers
# --------------------------------------------------------------------------- #

HEADER = """\
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Weaver//Interview Prep//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Interview Prep (6 weeks)
X-WR-TIMEZONE:Europe/London"""

VTIMEZONE = """
BEGIN:VTIMEZONE
TZID:Europe/London
BEGIN:STANDARD
DTSTART:19701025T020000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10
TZOFFSETFROM:+0100
TZOFFSETTO:+0000
TZNAME:GMT
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700329T010000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3
TZOFFSETFROM:+0000
TZOFFSETTO:+0100
TZNAME:BST
END:DAYLIGHT
END:VTIMEZONE"""

FOOTER = "\nEND:VCALENDAR"


def fmt_dt(dt: datetime) -> str:
    return dt.strftime("%Y%m%dT%H%M%S")


def esc(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def event(
    summary: str, start: datetime, end: datetime, desc: str, color: str = ""
) -> str:
    uid = str(uuid.uuid4())
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART;TZID={TZ}:{fmt_dt(start)}",
        f"DTEND;TZID={TZ}:{fmt_dt(end)}",
        f"SUMMARY:{esc(summary)}",
        f"DESCRIPTION:{esc(desc)}",
    ]
    if color:
        lines.append(f"COLOR:{color}")
    lines.append("END:VEVENT")
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# Generate events
# --------------------------------------------------------------------------- #


def get_phase(week: int) -> str:
    for p in PHASES:
        if week in p["weeks"]:
            return p["name"]
    return "Foundation"


def get_week_num(date: datetime) -> int:
    delta = (date - FIRST_MONDAY).days
    return (delta // 7) + 1


def generate() -> str:
    events: list[str] = []

    # --- Setup day: Saturday March 14 ---
    d = START_DATE
    events.append(
        event(
            "Meditation",
            d.replace(hour=6, minute=0),
            d.replace(hour=6, minute=30),
            "20-30 min. Settle in. This is day one of six weeks.\n"
            "You know how to do this.",
        )
    )
    events.append(
        event(
            "Exercise",
            d.replace(hour=6, minute=30),
            d.replace(hour=7, minute=30),
            "Kettlebells, walk, whatever moves. Start the routine.",
        )
    )
    events.append(
        event(
            "SETUP: Accounts + Tools",
            d.replace(hour=8, minute=0),
            d.replace(hour=10, minute=0),
            "Get everything set up so Monday is pure execution.\n\n"
            "1. NeetCode account - start the NeetCode 150 roadmap\n"
            "2. NeetCode system design course - bookmark, review syllabus\n"
            "3. Codecrafters account - select Build-your-own Redis (TypeScript or Go)\n"
            "4. Set up a clean coding environment: NO copilot, NO autocomplete, NO AI\n"
            "   - VS Code: disable GitHub Copilot extension\n"
            "   - Terminal: no claude, no codex, no gemini\n"
            "5. Get a physical notebook for system design sketches\n"
            "6. Test run: solve 1 easy NeetCode problem to verify the flow works\n\n"
            "Rule for the next 6 weeks: NO AI. The discomfort is the signal.",
        )
    )
    events.append(
        event(
            "SETUP: Plan Review",
            d.replace(hour=10, minute=30),
            d.replace(hour=11, minute=30),
            "Review the 6-week plan.\n\n"
            "Phase 1 (Foundation, weeks 1-2): Easy NeetCode + Redis + System Design basics\n"
            "Phase 2 (Ramp, weeks 3-4): Medium NeetCode + HTTP Server + Design classics\n"
            "Phase 3 (Integration, weeks 5-6): Timed medium + Docker + Mock interviews\n\n"
            "Two resources: NeetCode and Codecrafters. Nothing else.\n"
            "6 hours of focused work per day. 4 blocks of 90 min.\n"
            "Gaps between blocks are breaks. Use them.\n\n"
            "Print or write down the weekly schedule. Put it on the wall.",
        )
    )

    # --- Sunday March 15: Off ---
    d = START_DATE + timedelta(days=1)
    events.append(
        event(
            "DAY OFF",
            d.replace(hour=8, minute=0),
            d.replace(hour=8, minute=30),
            "No code. No study. Rest before the work begins.",
        )
    )

    # --- Weekdays: 6 weeks ---
    for week in range(1, WEEKS + 1):
        phase = get_phase(week)
        cc_project = CC_PROJECTS[week]
        nc_design = NC_DESIGN_TOPICS[week]
        nc_algo = NC_ALGO_DESC[phase]
        cc_desc = CC_DESC[cc_project]

        week_start = FIRST_MONDAY + timedelta(weeks=week - 1)

        for dow in range(5):  # Mon-Fri
            d = week_start + timedelta(days=dow)
            phase_tag = f"[Phase: {phase} | Week {week} | Day {dow + 1}]"
            b4_title, b4_desc = BLOCK4_BY_DOW[dow]

            # Meditation
            events.append(
                event(
                    "Meditation",
                    d.replace(hour=6, minute=0),
                    d.replace(hour=6, minute=30),
                    "20-30 min. Non-negotiable.\n"
                    "This is not leisure - it is cognitive maintenance.",
                )
            )

            # Exercise
            events.append(
                event(
                    "Exercise",
                    d.replace(hour=6, minute=30),
                    d.replace(hour=7, minute=30),
                    "Kettlebells, bodyweight, walk - whatever moves.\n"
                    "Get blood flowing before the first focus block.",
                )
            )

            # Block 1: NeetCode Algorithms
            events.append(
                event(
                    f"Block 1: NeetCode Algorithms ({phase})",
                    d.replace(hour=8, minute=0),
                    d.replace(hour=9, minute=30),
                    f"{phase_tag}\n\n{nc_algo}\n\n"
                    "RULE: No AI. No autocomplete. No copilot.\n"
                    "If you reach for a tool, that is the muscle atrophying. Stay with it.",
                )
            )

            # Block 2: Codecrafters
            events.append(
                event(
                    f"Block 2: Codecrafters - {cc_project}",
                    d.replace(hour=10, minute=0),
                    d.replace(hour=11, minute=30),
                    f"{phase_tag}\n\n{cc_desc}\n\n"
                    "RULE: No AI. No copilot. Read the docs. Read the error messages.\n"
                    "Every stage you complete by hand rebuilds the muscle.",
                )
            )

            # Block 3: NeetCode System Design
            events.append(
                event(
                    f"Block 3: System Design ({phase})",
                    d.replace(hour=12, minute=0),
                    d.replace(hour=13, minute=30),
                    f"{phase_tag}\n\n{nc_design}\n\n"
                    "Mon-Wed: Watch NeetCode videos, take notes BY HAND in notebook.\n"
                    "Thu-Fri: Practice designing systems out loud, draw on paper.\n\n"
                    "Key skill: drive the conversation. Ask clarifying questions.\n"
                    "Make trade-offs explicit. Draw while talking.\n\n"
                    "RULE: No AI. Paper and pen for diagrams.",
                )
            )

            # Block 4: Integration (varies by day)
            events.append(
                event(
                    f"Block 4: {b4_title}",
                    d.replace(hour=14, minute=30),
                    d.replace(hour=16, minute=0),
                    f"{phase_tag}\n\n{b4_desc}\n\n"
                    "After this block, you are DONE for the day.\n"
                    "16:00-18:00 is leisure. No code. No study.",
                )
            )

        # Saturday: light review
        sat = week_start + timedelta(days=5)
        events.append(
            event(
                "Meditation",
                sat.replace(hour=6, minute=0),
                sat.replace(hour=6, minute=30),
                "20-30 min.",
            )
        )
        events.append(
            event(
                "Exercise",
                sat.replace(hour=6, minute=30),
                sat.replace(hour=7, minute=30),
                "Move. Lighter session if you need it.",
            )
        )
        events.append(
            event(
                f"Light Review (Week {week} - {phase})",
                sat.replace(hour=9, minute=0),
                sat.replace(hour=11, minute=0),
                f"Week {week} ({phase}) - optional light review.\n\n"
                "Review any problems you struggled with this week.\n"
                "Solve 1-2 from memory if you feel like it.\n"
                "Sketch one system design on paper.\n\n"
                "If you feel rested and sharp, do the work.\n"
                "If you feel drained, rest. Recovery is not optional.\n"
                "You know this from the clinical side.\n\n"
                "No new material on Saturdays.",
            )
        )

        # Sunday: off
        sun = week_start + timedelta(days=6)
        events.append(
            event(
                "DAY OFF",
                sun.replace(hour=8, minute=0),
                sun.replace(hour=8, minute=30),
                f"Week {week} complete. No code. No study.\n"
                "Do something that has nothing to do with engineering.",
            )
        )

    # --- Final event: Week 7 Monday - Go time ---
    go_day = FIRST_MONDAY + timedelta(weeks=6)
    events.append(
        event(
            "INTERVIEW PREP COMPLETE - Go Time",
            go_day.replace(hour=8, minute=0),
            go_day.replace(hour=9, minute=0),
            "Six weeks done.\n\n"
            "You have solved 60-90 algorithm problems by hand.\n"
            "You have built 3 real systems from scratch.\n"
            "You have studied and practised system design weekly.\n"
            "You have done mock interviews.\n\n"
            "The manual coding muscle is back.\n"
            "The system design vocabulary is loaded.\n"
            "The portfolio (The Pit, oceanheart.ai) was already strong.\n\n"
            "Now go interview. Top-choice companies from here.\n"
            "Lead with what you built. Let the prep show in the room.",
        )
    )

    # Assemble
    parts = [HEADER, VTIMEZONE]
    for e in events:
        parts.append(e)
    parts.append(FOOTER)
    return "\n".join(parts)


if __name__ == "__main__":
    print(generate())
