(async()=>{for(;!Spicetify.React||!Spicetify.ReactDOM;)await new Promise(t=>setTimeout(t,10));var a,r,n,s,t;function c(){var t=Spicetify.LocalStorage.get("songMappings");if(!t)return console.log("No song mappings found."),{};try{return JSON.parse(t)}catch(t){return console.error("Failed to parse songMappings from LocalStorage:",t),{}}}a=class extends HTMLElement{constructor(t,a){var e;super();let{sourceTrack:r,boundTracks:i}=t;t=i[0],this.innerHTML=`
            <div class="bookmark-card">
                <div class="bookmark-card-info">
                    <div class="bookmark-card-title">${r.name}</div>
                    <div class="bookmark-card-artist">${null==(e=r.artists)?void 0:e[0].name}</div>
                </div>
                <span class="bookmark-card-arrow"> -> </span>
                <div class="bookmark-card-info">
                    <div class="bookmark-card-title">${t.name}</div>
                    <div class="bookmark-card-artist">${null==(e=t.artists)?void 0:e[0].name}</div>
                </div>
                <button class="bookmark-controls" data-tippy-content="Remove binding"><svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">${Spicetify.SVGIcons.x}</svg></button>
            </div>
        `,Spicetify.Tippy(this.querySelectorAll("[data-tippy-content]"),Spicetify.TippyProps),t=this.querySelector(".bookmark-controls");t&&(t.onclick=t=>{{var e=r.uri,i="songMappings",o=Spicetify.LocalStorage.get(i);let t={};try{o&&(t=JSON.parse(o))}catch(t){console.warn("Failed to parse songMappings from LocalStorage, starting fresh.")}delete t[e],Spicetify.LocalStorage.set(i,JSON.stringify(t))}a.apply(),t.stopPropagation()})}},r=class{constructor(){(t=document.createElement("div")).id="bookmark-spicetify",t.className="context-menu-container",t.style.zIndex="1029",(i=document.createElement("style")).textContent=`
        #bookmark-spicetify {
            position: absolute;
            left: 0;
            right: 0;
            width: 100vw;
            height: 100vh;
            z-index: 5000;
        }
        #bookmark-menu {
            display: inline-block;
            width: 25%;
            min-width: 500px;
            max-height: 70%;
            overflow: hidden auto;
            position: absolute;
            z-index: 5001;
            padding: 8px;
        }
        bookmark-card-container:last-child .bookmark-card {
            border: none;
            margin: 0;
        }
        .bookmark-card {
            display: grid;
            grid-template-columns: 1fr 24px 1fr 42px;
            margin-bottom: 8px;
            border-bottom: solid 1px #7f7f7f;
        }
        .bookmark-card-image {
            width: 70px;
            height: 70px;
            object-fit: cover;
            object-position: center center;
            border-radius: 4px;
        }
        .bookmark-card-info {
            padding: 10px 10px;
            color: var(--spice-text);
        }
        .bookmark-card-arrow {
            display: flex;
            align-items: center;
        }
        .bookmark-card-title {
            color: var(--text-base);
            font-size: var(--encore-text-size-base);
        }
        .bookmark-card-artist {
            color: var(--text-subdued);
            font-size: var(--encore-text-size-smaller);
        }
        .bookmark-controls {
            margin: 10px 0 10px 10px;
            width: 24px;
            height: 24px;
            align-items: center;
            background-color: rgba(var(--spice-rgb-shadow),.7);
            border: none;
            border-radius: 50%;
            color: var(--spice-text);
            cursor: pointer;
            display: inline-flex;
            justify-content: center;
            padding: 8px;
        }
    `,(e=document.createElement("ul")).id="bookmark-menu",e.className="main-contextMenu-menu",e.onclick=t=>t.stopPropagation(),t.append(i,e);var t,e,i={container:t,menu:e};this.container=i.container,this.items=i.menu,this.lastScroll=0,this.container.onclick=()=>{this.storeScroll(),this.container.remove()},this.apply()}apply(){this.items.textContent="";var t,e=c();for(t of Object.values(e))this.items.append(new a(t,this))}changePosition(t,e){this.items.style.left=t+"px",this.items.style.top=e+40+"px"}storeScroll(){this.lastScroll=this.items.scrollTop}setScroll(){this.items.scrollTop=this.lastScroll}},n=async t=>{await Spicetify.addToQueue(t.map(t=>({uri:t})));let i=(Spicetify.Queue.nextTracks||[]).filter(t=>"context"!==t.provider).length;i&&(t=Spicetify.Queue.nextTracks.filter(t=>"context"!==t.provider).filter((t,e)=>e>=i),await Spicetify.Platform.PlayerAPI.reorderQueue(t.map(t=>t.contextTrack),{before:Spicetify.Queue.nextTracks[0].contextTrack}))},s=async(e,t)=>{var i=Spicetify.URI.Type;if(0!==(e=[i.PLAYLIST,i.PLAYLIST_V2].includes(Spicetify.URI.fromString(e[0]).type)?(await Spicetify.Platform.PlaylistAPI.getContents(e[0])).items.map(t=>t.uri):e).length){1<e.length&&Spicetify.showNotification("Warning (Bound Tracks): Only binding the first track selected");var i=e[0],o=null==(o=null==(o=null==(o=Spicetify.Player)?void 0:o.data)?void 0:o.item)?void 0:o.uri;if(i!==o){i=null==(i=Spicetify.Player)?void 0:i.data.item;e=(e=e[0]).split(":")[2];i={sourceTrack:i,boundTracks:[await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/tracks/"+e)]};{e=o;o=i;var i="songMappings",a=Spicetify.LocalStorage.get(i);let t={};try{a&&(t=JSON.parse(a))}catch(t){console.warn("Failed to parse songMappings from LocalStorage, starting fresh.")}t[e]=o,Spicetify.LocalStorage.set(i,JSON.stringify(t))}t.apply()}}},t=async function t(){if(!Spicetify.CosmosAsync||!Spicetify.URI)return void setTimeout(t,300);Spicetify.Player.addEventListener("songchange",t=>{t&&(async t=>{t=(null==t?void 0:t.item).uri;let i=null==(t=null==(t=c()[t])?void 0:t.boundTracks[0])?void 0:t.uri;i&&setTimeout(async()=>{var t=await Spicetify.Platform.PlayerAPI.getQueue(),e=(null==(e=null==(e=t.nextUp)?void 0:e[0])?void 0:e.uri)===i||(null==(t=null==(e=t.queued)?void 0:e[0])?void 0:t.uri)===i;i&&!e&&n([i])},250)})(t.data)});let e=Spicetify.URI.Type;new Spicetify.ContextMenu.Item("Always play this after the current song",t=>{s(t,i)},t=>t.every(t=>[e.TRACK].includes(Spicetify.URI.fromString(t).type))).register(),customElements.define("bookmark-card-container",a);let i=new r;new Spicetify.Topbar.Button("Bound Tracks",`<svg id="connect" height="24px" width="24px" version="1.1" id="XMLID_127_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            viewBox="0 0 24 24" xml:space="preserve">
            <g>
                <path d="M5.9,24c-1.6,0-3.1-0.6-4.2-1.7C0.6,21.2,0,19.7,0,18.1c0-1.6,0.6-3.1,1.7-4.2l3.8-3.8l2,2l2.8-2.8l1.4,1.4l-2.8,2.8
                    l1.6,1.6l2.8-2.8l1.4,1.4l-2.8,2.8l2,2l-3.7,3.8C9,23.3,7.5,24,5.9,24z M5.5,12.9l-2.3,2.3C2.4,16,2,17,2,18s0.4,2,1.2,2.8
                    c1.5,1.5,4.1,1.5,5.6,0l2.3-2.4L5.5,12.9z M18.5,13.9l-8.4-8.4l3.7-3.8C14.9,0.6,16.5,0,18,0c1.5,0,3,0.6,4.2,1.7
                    C23.4,2.8,24,4.3,24,5.9s-0.6,3.1-1.7,4.2L18.5,13.9z M13,5.5l5.5,5.5l2.3-2.3C21.6,7.9,22,7,22,5.9c0-1-0.4-2-1.2-2.8
                    c-1.5-1.5-4-1.5-5.6,0L13,5.5z"/>
            </g>
        </svg>`,t=>{t=t.element.getBoundingClientRect(),i.changePosition(t.left,t.top),document.body.append(i.container),i.setScroll()}).element.classList.add("bound-tracks-topbar-button");var o=document.createElement("style");o.textContent=`
        #connect {
            fill: var(--text-subdued);
        }
        .bound-tracks-topbar-button {
            margin-left: 12px;
        }
        .bound-tracks-topbar-button > button {
            background-color: var(--background-elevated-base);
            border-radius: 50%;
            height: 48px;
            width: 48px;
        }
    `,document.head.append(o)},(async()=>{await t()})()})();