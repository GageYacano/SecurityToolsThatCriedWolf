import requests
import os
import json
from bs4 import BeautifulSoup

# Configuration from Secrets
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN")
DISCORD_WEBHOOK = os.getenv("NEWS_WEBHOOK")
COURSE_ID = "1496658" # Replace with your actual course ID
CANVAS_DOMAIN = "webcourses.ucf.edu" # Change if your school uses a custom domain

latest_post_file = "latest_announcement_id.txt"
def artifact_output(file_name):
    id = ""
    with open(file_name) as file:
        id = file.read().strip()
    return id
    
def publish_artifact(file_name, id):
    with open(file_name, "w") as file:
        file.write(str(id))
    return 
def poll():
    token = CANVAS_TOKEN.strip() if CANVAS_TOKEN else ""

    # check for canvas or discord token
    if not token or not DISCORD_WEBHOOK:
        print("didn't find environment variables. Quitting...")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://{CANVAS_DOMAIN}/api/v1/announcements?context_codes[]=course_{COURSE_ID}"
    
    response = requests.get(url, headers=headers)
    announcements = response.json()

    if not announcements:
        return

    # In a simple setup, we just grab the latest one
    latest = announcements[0]
    id = str(latest.get("id"))

    # look at artifact output
    if os.path.isfile(latest_post_file):
        if id == artifact_output(latest_post_file):
            print("already sent! skipping...")
            return
    
    title = latest.get("title", "No Title")
    raw_html = latest.get("message", "")
    
    # Use BeautifulSoup to clean the mess
    soup = BeautifulSoup(raw_html, "html.parser")

    # Remove script and style elements so their code doesn't show up as text
    for script_or_style in soup(["script", "style", "link"]):
        script_or_style.decompose()

    # Get text and handle whitespace
    clean_message = soup.get_text(separator="\n")
    
    # Optional: Discord uses Markdown, so if you want to keep links clickable, 
    # BeautifulSoup can be more complex, but get_text is the best "quick fix."    
    
    # Send to Discord
    payload = {
        "embeds": [{
            "title": f"Hey losers! I got an announcement: {title}",
            "description": clean_message[:2000], # Discord limit
            "color": 5814783,
            "url": latest.get("html_url")
        }]
    }
    resp = requests.post(DISCORD_WEBHOOK, json=payload)
    
    if resp.status_code in [200, 204]:
        # Only update the "memory" file if Discord actually received it
        publish_artifact(latest_post_file, id)
        print(f"Successfully posted {id}")
    else:
        print(f"Discord error: {resp.status_code}")
if __name__ == "__main__":
    poll()
