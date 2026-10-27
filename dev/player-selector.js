// Browser-only extension to Studio's host. All game seats still come through the SDK roster.
(() => {
  const host = window.BoardSDK;
  if (!host?.__simulated) return;
  host.__sim.glyph = 2;
  const originalPlayers = host.getPlayers.bind(host);
  const changes = new Map();
  let types = [], requestId = 500000, guestId = 20;
  host.setAIPlayerTypes = json => { try { types = JSON.parse(json); } catch { types = []; } };
  host.getPlayers = () => JSON.stringify(JSON.parse(originalPlayers()).map((p, i) => ({ ...p, name: i === 0 ? 'Player 1' : p.name, ...(changes.get(p.sessionId) ?? {}) })));
  const choose = replaceId => {
    const id = requestId++;
    const root = document.createElement('div'); root.dataset.boardSim = 'selector';
    Object.assign(root.style, { position:'fixed', inset:'0', background:'rgba(20,44,63,.55)', display:'grid', placeItems:'center', zIndex:'2147483647', color:'#183e4b', fontFamily:'system-ui,sans-serif' });
    const card = document.createElement('section');
    Object.assign(card.style, { background:'#fffced', borderRadius:'28px', padding:'36px', width:'min(450px,80vw)', boxShadow:'0 18px 60px #1235' });
    const title = document.createElement('h2'); title.textContent = 'Choose your opponent'; title.style.margin = '0 0 10px';
    const help = document.createElement('p'); help.textContent = 'Two players on one screen, or a duel with Pip.';
    card.append(title, help);
    const finish = selected => {
      if (selected) {
        let sessionId = replaceId;
        if (sessionId === undefined) { sessionId = guestId++; host.addGuest(sessionId); }
        changes.set(sessionId, selected);
      }
      root.remove(); window.__board?.onPlayersChanged(); window.__board?.resolve(id, JSON.stringify(Boolean(selected)));
    };
    const option = (label, data, primary = false) => {
      const b = document.createElement('button'); b.textContent = label;
      Object.assign(b.style, { display:'block', width:'100%', padding:'20px', marginTop:'14px', border:'0', borderRadius:'16px', background:primary?'#157f89':'#e6efdc', color:primary?'white':'#183e4b', fontSize:'20px', fontWeight:'750', cursor:'pointer' });
      b.onclick = () => finish(data); card.append(b);
    };
    option('Two players · Friend beside you', { name:'Player 2', type:'guest' }, true);
    const ai = types[0];
    if (ai) option('Solo · Play against ' + ai.name, {name:ai.name, type:'ai', aiTypeIndex:0});
    option('Cancel', null); root.append(card); document.body.append(root);
    return id;
  };
  host.presentAddPlayerSelector = () => choose(undefined);
  host.presentReplacePlayerSelector = sessionId => choose(sessionId);
})();
