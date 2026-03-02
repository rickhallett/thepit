import re
import numpy as np
import yaml

texts = {
    "1a": "I'm building a new distributed system today, and I've got to ask: why do we still use REST? Don't get me wrong, it's great for simple things. But when I'm dealing with thousands of nodes, I really don't want to wait around, you know? What's the alternative? I've been looking into gRPC. It's fast, it's typed, and it just makes sense to me. I'll admit I'm a bit biased. I've used it before and it hasn't let me down. Why haven't you switched yet? Isn't it time we all moved on? I mean, I can't be the only one who's tired of parsing JSON. We're wasting so many cycles! It's wild. You'd think we'd have figured this out by now. I'm going to spend the weekend rewriting my services. I know it's a lot of work, but I'll feel much better once it's done. Have you tried doing this yourself? It's honestly not that bad. I'd love to hear what you think about it. Are we just stuck in our ways? I'm starting to think so. I've talked to a few friends, and they're all saying the same thing. We've got to change how we build these apps. I can't believe I didn't see it sooner. It's right there in front of us! Don't you see it? I'll put together a quick demo. I'm sure you'll see what I mean once I show you the code. It's incredibly clean. You won't believe how much boilerplate we're dropping. I've never been so excited about a refactor. Why did I wait so long? It's a mystery. I'm just glad I'm doing it now. Let's make it happen!",
    "1b": "The experience of severe illness fundamentally alters the perception of time and agency. Upon receiving a diagnosis of chronic fatigue syndrome, the immediate consequence is a profound disorientation regarding personal capability. The structured progression of a career is abruptly replaced by the unpredictable dictates of physical exhaustion. Consequently, the conceptualization of the future undergoes a radical contraction. Ambitions are discarded; the management of daily energy expenditure becomes the primary occupation. Furthermore, the medical establishment frequently demonstrates a systemic inability to address conditions characterized by subjective fatigue rather than objective biomarkers. The patient is subjected to endless evaluations, each yielding negative results, which paradoxically increases the psychological burden. Ultimately, adaptation requires the relinquishment of prior identity and the slow construction of a new equilibrium. This process demands immense patience and a deliberate recalibration of expectations. The isolation inherent in chronic illness further exacerbates the difficulty of this transition. Social interactions diminish due to the sheer physiological cost of participation. However, within this state of enforced restriction, a heightened appreciation for minimal achievements sometimes emerges. The completion of trivial tasks assumes monumental significance. Thus, the illness narrative is not merely a chronicle of loss, but also an account of enforced physiological negotiation. The transformation of the individual is absolute. Prior metrics of success lose their relevance entirely. Instead, the focus shifts toward the optimization of rest and the mitigation of symptom exacerbation. This paradigm shift requires considerable psychological resilience. The individual must navigate a society that exclusively values productivity, while simultaneously inhabiting a body incapable of sustained effort. The resulting cognitive dissonance is a persistent source of distress. Validation of the condition remains elusive, as the outward appearance of the patient frequently belies the internal physiological collapse. Ultimately, the resolution of this conflict involves a complete redefinition of self-worth, decoupled from economic or professional output. The journey is fraught with setbacks, yet it facilitates a profound, if unwelcome, introspection regarding the true determinants of human value.",
    "1c": "We seek the truth—but the truth eludes us. We chase the light—but the light blinds us. I've spent years looking for answers in the noise of the internet. It's a strange place, full of brilliant minds and empty vessels. We write code not just to build, but to understand. To understand the machine is to understand ourselves. Why do we keep building? Because nothing is ever finished. Nothing is ever complete. We are builders. We are dreamers. Not yesterday, but today. I'm not a visionary, but I am a worker. Through the chaos, through the noise, we find meaning. Meaning requires effort. Effort requires patience. Patience is a virtue we've forgotten. I'll tell you what I've learned: the hardest problems aren't technical. The hardest problems are human. We want connection—we build walls. We want freedom—we build cages. Isn't it ironic? I've seen it happen time and time again. You start with a simple idea. The idea becomes a project. The project becomes a company. The company becomes a monster. Not out of malice, but out of momentum. Can we change it? I'm not sure. But I know we have to try. Instead of scaling up, what if we scaled down? Rather than chasing users, what if we chased value? It's not just a nice thought. It's a necessity. We need to remember why we started. We started to create. To create is to live. To live is to connect. Let's get back to the work. The real work.",
    "1d": "Hello my friends. Today I want to tell you about my computer. I buy it last year because I need to make the programming for my university. In my country, the computer is very expensive. So I save money for many months. When I get the box, I am very happy! I open it and see the screen is very bright. But I have a big problem. The keyboard is not in my language. It is english keyboard. I try to type but I make many mistakes. I am very sad. Why they don't sell the correct keyboard here? I don't know. Maybe the market is too small. But I don't give up. I practice every day. I use the software to learn typing. Now, I am very fast! I write my python code very quickly. It's amazing how the human brain can learn new things. Sometimes I still make a mistake, but it's okay. My friends say I am a hacker now. I laugh because I am just a student. But I love my computer. It gives me the connection to the world. I can read the tutorials, watch the videos, and talk to people in other countries. The technology is very beautiful. It breaks the borders between us. Do you remember your first computer? It is a special feeling. I will never forget this machine. It changed my life forever.",
    "1e": "We tell ourselves stories in order to live. Now, we ask the machines to tell them for us. I spent a few days in Palo Alto last month, watching the young men in their fleece vests feed prompts into the void. They seemed to believe they were summoning a new god, or perhaps just a more efficient way to generate marketing copy. It was difficult to tell the difference. The air in the valley was thick with a kind of desperate optimism, a frantic insistence that the algorithm would solve the human condition. I sat in a sleek coffee shop on University Avenue and listened to a twenty-something founder explain how his model would eliminate the need for human writers. 'It's just pattern recognition,' he said, stirring his oat milk latte. 'We're all just stochastic parrots anyway.' I looked at him, and then out the window at the bleached California sky. Was that all we were? A collection of predictable responses, waiting to be optimized? I thought about the notebooks stacked on my desk, the hours spent wrestling with a single sentence until it possessed a specific, undeniable rhythm. The machine could mimic the rhythm, certainly. It could produce the cadence of grief, the syntax of joy. But it felt nothing. It was a mirror reflecting a void. We are outsourcing our interiority to a statistical model. We are handing over the keys to our own consciousness. And the terrifying part is not that the machine might fail, but that it might succeed. That we might find its frictionless prose preferable to the messy, agonizing process of genuine thought. I left Palo Alto with a profound sense of vertigo. The ground was shifting, and the new world was being built by people who believed that language was merely data, waiting to be processed.",
    "5a": "I'm super excited to tell you about the best vacuum cleaners of 2026! Don't you just love a clean house? I know I do! I've been testing so many models, and I've got to say, it's been wild. Why is it so hard to find a good vacuum? I've asked myself that same question. But don't worry, I'm here to help you out. Let's dive in! Have you tried the new Dyson? It's amazing! I'll never go back to my old one. I've seen it pick up dirt I didn't even know was there. You're going to love it. Isn't the suction incredible? I've vacuumed my living room three times today just because it's so fun. What's your favorite attachment? I'm a big fan of the crevice tool. It gets right into the corners. I've never seen anything like it. Don't forget to empty the bin! I'll admit I forgot once, and it wasn't pretty. Are you ready to upgrade? I'm sure you are. Let's make cleaning great again! You won't regret it. I've told all my friends about it. They're buying them too! Why wouldn't they? It's simply the best.",
    "5b": "The architecture of the system necessitates a rigorous separation of concerns. Furthermore, the implementation of the authentication layer requires substantial modification to accommodate the novel security protocols. Consequently, the development team must prioritize the encapsulation of the core logic within isolated microservices. This structural reorganization prevents the propagation of state-related errors and ensures the robustness of the entire application. Moreover, the utilization of immutable data structures facilitates the deterministic verification of the system's behavior. The density of these technical requirements inevitably increases the complexity of the deployment pipeline. However, this complexity is an acceptable trade-off for the resulting stability. Specifically, the nominalization of the event stream allows for precise auditing of user interactions. Additionally, the establishment of a centralized logging facility is paramount. The meticulous observation of these guidelines guarantees a fault-tolerant environment. Ultimately, the successful execution of this strategy depends upon the rigorous enforcement of the aforementioned architectural principles. The transition period will undoubtedly present significant operational challenges. Nonetheless, the long-term viability of the platform fundamentally relies upon the immediate adoption of these paradigms. The systematic eradication of legacy dependencies remains the primary objective. The execution of this mandate is critical.",
}

CONTRACT_RE = re.compile(
    r"\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|"
    r"wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|"
    r"didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|"
    r"I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b",
    re.IGNORECASE,
)
FIRST_PERSON_RE = re.compile(r"\b(I|me|my|mine|myself)\b")
NOM_RE = re.compile(r"\b\w+(?:tion|ment|ness|ity|ence|ance)\b", re.IGNORECASE)
TRANSITION_RE = re.compile(
    r"\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|"
    r"Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|"
    r"Notably|Interestingly|Crucially|Essentially|Particularly)\b"
)

results = {}

for key, text in texts.items():
    words = [w for w in text.split() if w.strip()]
    tw = len(words)
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    ts = len(sentences)

    if tw == 0 or ts == 0:
        continue

    contractions = len(CONTRACT_RE.findall(text))
    contractionPer1k = contractions / tw * 1000

    firstPerson = len(FIRST_PERSON_RE.findall(text))
    firstPersonPer1k = firstPerson / tw * 1000

    questions = sum(1 for s in sentences if s.endswith("?"))
    questionRate = questions / ts * 100

    transitions = len(TRANSITION_RE.findall(text))
    transitionPer1k = transitions / tw * 1000

    absnoun = len(NOM_RE.findall(text))
    nomDensity = absnoun / tw * 100

    sum_score = (contractionPer1k + firstPersonPer1k + questionRate) - (
        transitionPer1k + nomDensity
    )

    results[key] = {
        "text": text,
        "sum_score": float(sum_score),
        "metrics": {
            "contractionPer1k": float(contractionPer1k),
            "firstPersonPer1k": float(firstPersonPer1k),
            "questionRate": float(questionRate),
            "transitionPer1k": float(transitionPer1k),
            "nomDensity": float(nomDensity),
        },
    }

with open("dagger-1-adversarial-texts-script.yaml", "w") as f:
    yaml.dump(results, f, default_flow_style=False)
