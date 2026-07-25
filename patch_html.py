import re

def main():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Add YouTube tab button
    if 'id="tabBtnYoutube"' not in html:
        html = html.replace(
            '<button class="tab-btn" id="tabBtnUpload" onclick="switchTab(\'upload\')">Upload</button>',
            '<button class="tab-btn" id="tabBtnUpload" onclick="switchTab(\'upload\')">Upload</button>\n                <button class="tab-btn" id="tabBtnYoutube" onclick="switchTab(\'youtube\')">YouTube</button>'
        )

    # 2. Add Profile button to user-bar
    if 'id="profileBtn"' not in html:
        html = re.sub(
            r'<button id="logoutBtn" onclick="handleLogout\(\)">Log Out</button>',
            '<button id="profileBtn" onclick="switchTab(\'profile\')">Profile</button>\n                <button id="logoutBtn" onclick="handleLogout()">Log Out</button>',
            html
        )

    # 3. Add Profile and YouTube sections right before `<script src="app.js" defer></script>`
    if 'id="youtubeSection"' not in html:
        sections = """
        <div class="view library-panel" id="profileSection" style="display:none; position:relative; top:0; transform:none; opacity:1; visibility:visible; width:100%;">
            <div class="track-meta-card" style="margin-top: 10px; width: 100%;">
                <h3>Update Profile</h3>
                <p style="margin-bottom:15px; opacity:0.8; text-transform:none;">Change your display name below.</p>
                <input class="neu-input" id="profileNameInput" type="text" placeholder="New Display Name" style="margin-bottom: 15px;">
                <button class="btn-block" id="profileSaveBtn" onclick="updateProfile()">Save Changes</button>
                <div id="profileMessage" style="margin-top: 10px; font-size: 0.8rem; text-align: center;"></div>
            </div>
        </div>

        <div class="view library-panel" id="youtubeSection" style="display:none; position:relative; top:0; transform:none; opacity:1; visibility:visible; width:100%;">
            <input class="library-search" id="youtubeSearchInput" type="text" placeholder="Search YouTube for music...">
            <button class="btn-block" id="youtubeSearchBtn" onclick="searchYoutube()" style="margin-top: 8px; margin-bottom: 8px; padding: 10px 0;">Search</button>
            <div class="library-list" id="youtubeList">
                <div class="library-empty">Search for a song or artist to play free music from YouTube.</div>
            </div>
        </div>
        
        <div id="youtubePlayerContainer" style="position:absolute; width:1px; height:1px; top:-9999px; left:-9999px; overflow:hidden; opacity:0; pointer-events:none;">
            <div id="youtubePlayer"></div>
        </div>
        """
        html = html.replace('<script src="app.js" defer></script>', sections + '\n    <script src="app.js" defer></script>')

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == '__main__':
    main()
