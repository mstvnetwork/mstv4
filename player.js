// Target UI components and video element hooks
const videoPlayer = document.getElementById('videoPlayer');
const channelContainer = document.getElementById('channelListContainer');
const currentTitleText = document.getElementById('currentProgramTitle');

// Request file over network relative to directory root
fetch('playlist.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Could not access playlist.json schema');
        }
        return response.json();
    })
    .then(playlistData => {
        if (playlistData && playlistData.length > 0) {
            // Render playlist buttons into sidebar container
            buildChannelMenu(playlistData);
            
            // Auto-trigger video engine on initial load with channel index 0
            playStream(playlistData[0], 0);
        } else {
            channelContainer.innerHTML = '<div style="color: #ff3b30; padding:10px;">Playlist contains no records.</div>';
        }
    })
    .catch(error => {
        console.error('Core engine initialization fault:', error);
        currentTitleText.textContent = "Error loading streams. Check console logging.";
        channelContainer.innerHTML = '<div style="color: #ff3b30; padding:10px;">Failed to read stream library.</div>';
    });

/**
 * Builds and appends item nodes to sidebar interface
 * @param {Array} channels 
 */
function buildChannelMenu(channels) {
    channelContainer.innerHTML = ''; // Wipe out fallback loader indicators
    
    channels.forEach((channel, index) => {
        const itemButton = document.createElement('button');
        itemButton.className = 'channel-btn';
        itemButton.id = `chan-node-${index}`;
        
        // Clean leading/trailing syntax spaces baked into the json keys
        const sanitizedTitle = channel.title ? channel.title.trim() : `Channel ${index + 1}`;
        itemButton.textContent = sanitizedTitle;
        
        // Event registry for swap actions
        itemButton.addEventListener('click', () => {
            playStream(channel, index);
        });
        
        channelContainer.appendChild(itemButton);
    });
}

/**
 * Feeds target stream endpoint path to native pipeline elements
 * @param {Object} channel 
 * @param {Number} activeIndex 
 */
function playStream(channel, activeIndex) {
    if (!channel.url) {
        console.error('Selected item metadata missing valid url source string');
        return;
    }

    // Clean whitespace formatting errors from GitHub file content securely
    const streamUrl = channel.url.trim(); 
    const cleanTitle = channel.title ? channel.title.trim() : "Live Stream";
    
    // Process media node switch actions securely
    videoPlayer.src = streamUrl;
    videoPlayer.load();
    
    // Prevent common visual browser security block policies during boot sequences
    videoPlayer.play()
        .catch(err => {
            console.log("Autoplay configuration warning: User interactions required to establish pipeline acoustics.");
        });
        
    // Adjust metadata context across text targets
    currentTitleText.textContent = cleanTitle;

    // Reset visual highlight state indicators across list items
    const allButtons = document.querySelectorAll('.channel-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));

    const currentButton = document.getElementById(`chan-node-${activeIndex}`);
    if (currentButton) {
        currentButton.classList.add('active');
        currentButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
