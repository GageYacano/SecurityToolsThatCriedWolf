import requests
import os
import json

# Configuration from Secrets
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN")
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK")
COURSE_ID = "1496658" # Replace with your actual course ID
CANVAS_DOMAIN = "https://webcourses.ucf.edu/" # Change if your school uses a custom domain

latest_post_file = ""
def artifact_output(file_name):
    id = ""
    with open(file_name) as file:
        id = file.read()
    return id
    
def publish_artifact(file_name, id):
    with open(file_name, "w") as file:
        file.write(id)
    return 
def poll():
    headers = {"Authorization": f"Bearer {CANVAS_TOKEN}"}
    url = f"https://{CANVAS_DOMAIN}/api/v1/announcements?context_codes[]=course_{COURSE_ID}"
    
    response = requests.get(url, headers=headers)
    announcements = response.json()

    if not announcements:
        return

    # In a simple setup, we just grab the latest one
    latest = announcements[0]
    id = latest.get("id")

    # look at artifact output
    if os.path.isfile(latest_post_file):
        if id == artifact_output(latest_post_file):
            return
    else:
        publish_artifact(artifact_output, id)
    
    title = latest.get("title", "No Title")
    message = latest.get("message", "").replace("<p>", "").replace("</p>", "\n") # Basic HTML cleanup
    
    # Send to Discord
    payload = {
        "embeds": [{
            "title": f"Hey losers! I got an announcement: {title}",
            "description": message[:2000], # Discord limit
            "color": 5814783
        }]
    }
    requests.post(DISCORD_WEBHOOK, json=payload)

if __name__ == "__main__":
    poll()
