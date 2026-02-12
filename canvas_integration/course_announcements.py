import requests
import os
from bs4 import BeautifulSoup

# Configuration
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN")
DISCORD_WEBHOOK = os.getenv("NEWS_WEBHOOK")
COURSE_ID = "1496658"
CANVAS_DOMAIN = "webcourses.ucf.edu"

# Standard file name
latest_post_file = "latest_announcement_id.txt"

def get_stored_id():
    if os.path.exists(latest_post_file):
        with open(latest_post_file, "r") as f:
            return f.read().strip()
    return ""

def update_stored_id(new_id):
    with open(latest_post_file, "w") as f:
        f.write(str(new_id))

def poll():
    token = CANVAS_TOKEN.strip() if CANVAS_TOKEN else ""
    if not token or not DISCORD_WEBHOOK:
        print("Missing environment variables. Quitting...")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{CANVAS_DOMAIN}/api/v1/announcements?context_codes[]=course_{COURSE_ID}"
    
    response = requests.get(url, headers=headers)
    announcements = response.json()

    if not announcements: return

    latest = announcements[0]
    current_id = str(latest.get("id"))
    stored_id = get_stored_id()

    print(f"Canvas ID: {current_id} | Stored ID: {stored_id}")

    if current_id == stored_id:
        print("Already sent! skipping...")
        return
    
    # Process Announcement
    title = latest.get("title", "No Title")
    soup = BeautifulSoup(latest.get("message", ""), "html.parser")
    for s in soup(["script", "style"]): s.decompose()
    clean_message = soup.get_text(separator="\n").strip()
    
    payload = {
        "embeds": [{
            "title": f"@everyone Hey Losers! Got an announcement: \n{title}",
            "description": clean_message[:2000],
            "color": 16753920,
            "url": latest.get("html_url")
        }]
    }
    
    resp = requests.post(DISCORD_WEBHOOK, json=payload)
    
    if resp.status_code in [200, 204]:
        update_stored_id(current_id)
        print(f"Successfully posted {current_id} and updated local file.")
    else:
        print(f"Discord error: {resp.status_code}")

if __name__ == "__main__":
    poll()