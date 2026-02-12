import requests
import os
import json

# Configuration from Secrets
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN", "").strip() # .strip() is crucial here
DISCORD_WEBHOOK = os.getenv("NEWS_WEBHOOK", "").strip()
COURSE_ID = "1496658" 
CANVAS_DOMAIN = "webcourses.ucf.edu"

# Set a real filename for the state tracking
LATEST_POST_FILE = "latest_id.txt"

def artifact_output(file_name):
    if not os.path.exists(file_name):
        return ""
    with open(file_name, "r") as file:
        return file.read().strip()
    
def publish_artifact(file_name, id_value):
    with open(file_name, "w") as file:
        file.write(str(id_value))

def poll():
    if not CANVAS_TOKEN:
        print("Error: CANVAS_TOKEN is missing!")
        return

    headers = {"Authorization": f"Bearer {CANVAS_TOKEN}"}
    url = f"https://{CANVAS_DOMAIN}/api/v1/announcements?context_codes[]=course_{COURSE_ID}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Check for HTTP errors
        announcements = response.json()
    except Exception as e:
        print(f"Failed to fetch announcements: {e}")
        return

    if not announcements or not isinstance(announcements, list):
        print("No announcements found or unexpected API response.")
        return

    # Canvas returns the newest first
    latest = announcements[0]
    current_id = str(latest.get("id"))

    # Compare with last known ID
    last_id = artifact_output(LATEST_POST_FILE)
    if current_id == last_id:
        print("No new announcements.")
        return

    # Update the tracker file
    publish_artifact(LATEST_POST_FILE, current_id)
    
    title = latest.get("title", "No Title")
    # Basic HTML cleanup (Canvas messages are HTML)
    message = latest.get("message", "").replace("<p>", "").replace("</p>", "\n")
    
    # Send to Discord
    payload = {
        "embeds": [{
            "title": f"New Announcement: {title}",
            "description": message[:2000],
            "color": 5814783,
            "url": latest.get("html_url") # Adds a link to the actual post
        }]
    }
    
    if DISCORD_WEBHOOK:
        requests.post(DISCORD_WEBHOOK, json=payload)
        print(f"Posted announcement {current_id} to Discord.")

if __name__ == "__main__":
    poll()
