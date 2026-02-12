import requests
import os
from bs4 import BeautifulSoup

# Configuration
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN")
DISCORD_WEBHOOK = os.getenv("NEWS_WEBHOOK")
COURSE_ID = "1496658"
CANVAS_DOMAIN = "webcourses.ucf.edu"

# GitHub API Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO = os.getenv("GITHUB_REPOSITORY")
VAR_NAME = "LAST_ANNOUNCEMENT_ID"

def get_stored_id():
    """Fetches the last ID from GitHub Repository Variables."""
    url = f"https://api.github.com/repos/{REPO}/actions/variables/{VAR_NAME}"
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json().get("value", "")
    print(f"Note: Could not fetch variable (Status: {response.status_code})")
    return ""

def update_stored_id(new_id):
    """Updates the GitHub Repository Variable with the new ID."""
    url = f"https://api.github.com/repos/{REPO}/actions/variables/{VAR_NAME}"
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}
    data = {"name": VAR_NAME, "value": str(new_id)}
    
    response = requests.patch(url, headers=headers, json=data)
    if response.status_code == 204:
        print(f"Successfully updated GitHub variable to {new_id}")
    else:
        print(f"Failed to update GitHub variable: {response.status_code} {response.text}")

def poll():
    token = CANVAS_TOKEN.strip() if CANVAS_TOKEN else ""
    if not token or not DISCORD_WEBHOOK or not GITHUB_TOKEN:
        print("Missing environment variables. Quitting...")
        return
    
    # 1. Get latest from Canvas
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{CANVAS_DOMAIN}/api/v1/announcements?context_codes[]=course_{COURSE_ID}"
    
    try:
        response = requests.get(url, headers=headers)
        announcements = response.json()
    except Exception as e:
        print(f"Canvas API Error: {e}")
        return

    if not announcements:
        return

    latest = announcements[0]
    current_id = str(latest.get("id"))

    # 2. Check against GitHub Variable
    stored_id = get_stored_id()
    print(f"Canvas ID: {current_id} | Stored ID: {stored_id}")

    if current_id == stored_id:
        print("Already sent! skipping...")
        return
    
    # 3. Clean Message
    title = latest.get("title", "No Title")
    soup = BeautifulSoup(latest.get("message", ""), "html.parser")
    for s in soup(["script", "style"]): s.decompose()
    clean_message = soup.get_text(separator="\n").strip()
    
    # 4. Post to Discord
    payload = {
        "embeds": [{
            "title": f"Hey Losers! Got an announcement: \n{title}",
            "description": clean_message[:2000],
            "color": 16753920, # UCF Gold
            "url": latest.get("html_url")
        }]
    }
    
    resp = requests.post(DISCORD_WEBHOOK, json=payload)
    
    if resp.status_code in [200, 204]:
        # 5. Update Variable only on success
        update_stored_id(current_id)
        print(f"Posted {current_id}")
    else:
        print(f"Discord error: {resp.status_code}")

if __name__ == "__main__":
    poll()