"""Test skills before and after optimization using Groq API."""
import os, json, time
from openai import OpenAI

API_KEY = os.environ.get("GROQ_API_KEY", "")
client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=API_KEY)
MODEL = "llama-3.1-8b-instant"

SKILLS_DIR = r"C:\Users\prarh\Downloads\BRAHMAND AI AGENT\skills"
BATCH_DIR = r"C:\Users\prarh\Downloads\BRAHMAND AI AGENT\skillopt\batch_output"
OUTPUT_DIR = r"C:\Users\prarh\Downloads\BRAHMAND AI AGENT\skillopt\comparison"

os.makedirs(OUTPUT_DIR, exist_ok=True)

SKILLS_TO_TEST = [
    {
        "name": "ram",
        "label": "RAM & Memory System",
        "prompt": "The user says: 'mera naam Rohit hai aur main Delhi se hoon. kal maine ek article pada AI ke baare mein.' Remember this information and recall it when asked. What do you know about the user?",
    },
    {
        "name": "conversational_principles",
        "label": "Conversational Principles",
        "prompt": "User says: 'mujhe aaj bahut gussa aa raha hai kyunki mera kaam nahi hua.' Respond appropriately.",
    },
    {
        "name": "instagram",
        "label": "Instagram Content",
        "prompt": "Create an Instagram caption for Brahmand about the upcoming festival of Guru Purnima. The brand is modern, spiritual, premium. Keep it under 150 words.",
    },
]


def read_skill(orig_path, opt_dir, skill_name):
    with open(orig_path, encoding="utf-8") as f:
        original = f.read()
    skills_sub = os.path.join(opt_dir, skill_name, "skills")
    versions = sorted([f for f in os.listdir(skills_sub) if f.endswith(".md")])
    latest_path = os.path.join(skills_sub, versions[-1])
    with open(latest_path, encoding="utf-8") as f:
        optimized = f.read()
    return original, optimized


def test_skill(skill_text, prompt, label):
    try:
        system = f"You are an AI assistant. Use this skill to guide your response:\n\n{skill_text}\n\nRespond naturally."
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
            temperature=0.7,
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"[ERROR: {e}]"


for skill in SKILLS_TO_TEST:
    name = skill["name"]
    orig_path = os.path.join(SKILLS_DIR, f"{name}.md")
    
    if not os.path.exists(os.path.join(BATCH_DIR, name, "skills")):
        print(f"\n=== {skill['label']} ===\nSKIP: no training output found")
        continue
    
    original, optimized = read_skill(orig_path, BATCH_DIR, name)
    
    print(f"\n=== {skill['label']} ===")
    print(f"Original: {len(original)} chars | Optimized: {len(optimized)} chars (+{len(optimized)-len(original)})")
    
    prompt = skill["prompt"]
    print(f"Prompt: {prompt[:80]}...")
    
    # Original
    print("  [BEFORE] Generating with ORIGINAL skill...")
    before_resp = test_skill(original, prompt, "ORIGINAL")
    time.sleep(1)
    
    # Optimized
    print("  [AFTER]  Generating with OPTIMIZED skill...")
    after_resp = test_skill(optimized, prompt, "OPTIMIZED")
    time.sleep(1)
    
    # Save
    result = {
        "skill": name,
        "prompt": prompt,
        "original_size": len(original),
        "optimized_size": len(optimized),
        "original_response": before_resp,
        "optimized_response": after_resp,
    }
    with open(os.path.join(OUTPUT_DIR, f"{name}_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n--- BEFORE (original) ---\n{before_resp[:500]}")
    print(f"\n--- AFTER (optimized) ---\n{after_resp[:500]}")
    print(f"\n{'='*60}")

print("\n\nAll comparisons saved to:", OUTPUT_DIR)
