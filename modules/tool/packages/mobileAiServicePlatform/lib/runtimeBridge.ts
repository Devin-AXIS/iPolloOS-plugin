const RUNTIME_BRIDGE_SCRIPT = `<script>
(function(){
  if (window.iPolloOSAI && window.iPolloOSAI.__runtimeBridge) return;
  var seq = 0;
  function readText(payload){
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) return payload.map(readText).filter(Boolean).join('\\n');
    if (typeof payload === 'object') {
      var keys = ['answer','answerText','text','content','output','message','result','data'];
      for (var i = 0; i < keys.length; i++) {
        var value = readText(payload[keys[i]]);
        if (value) return value;
      }
      if (Array.isArray(payload.choices) && payload.choices[0]) {
        return readText(payload.choices[0].message || payload.choices[0].delta || payload.choices[0].text);
      }
      if (Array.isArray(payload.responseData)) {
        for (var j = payload.responseData.length - 1; j >= 0; j--) {
          var itemText = readText(payload.responseData[j]);
          if (itemText) return itemText;
        }
      }
    }
    return '';
  }
  function runtimeConfig(){
    return window.__IPOLLOOS_AI_RUNTIME__ || window.__IPOLLOOS_INTERACTIVE_SUBMIT__ || window.__FASTGPT_INTERACTIVE_SUBMIT__ || {};
  }
  function call(request){
    request = request || {};
    var cfg = runtimeConfig();
    var id = 'runtime-' + Date.now() + '-' + (++seq);
    var action = request.action || request.intent || 'chat';
    var input = request.input || {};
    var context = request.context || {};
    var messages = request.messages || [{
      role: 'user',
      content: JSON.stringify({ action: action, input: input, context: context })
    }];
    if (cfg.url && cfg.token) {
      return fetch(cfg.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          appId: cfg.appId,
          chatId: cfg.chatId || id,
          interactiveSubmitToken: cfg.token,
          stream: false,
          detail: true,
          variables: {
            action: action,
            input: input,
            context: context,
            runtime_call_id: id
          },
          messages: messages
        })
      }).then(function(res){
        return res.text().then(function(text){
          var payload = null;
          try { payload = text ? JSON.parse(text) : null; } catch (err) { payload = text; }
          if (!res.ok) {
            var msg = readText(payload) || text || 'iPolloOS Runtime 调用失败';
            var error = new Error(msg);
            error.payload = payload;
            throw error;
          }
          return { id: id, action: action, raw: payload, text: readText(payload) };
        });
      });
    }
    return new Promise(function(resolve, reject){
      var timeout = setTimeout(function(){
        window.removeEventListener('message', onMessage);
        reject(new Error('iPolloOS Runtime 未连接'));
      }, request.timeout || 45000);
      function onMessage(event){
        var data = event.data || {};
        if (!data || data.type !== 'ipolloos:ai-runtime:response' || data.id !== id) return;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        if (data.error) reject(new Error(String(data.error)));
        else resolve(data.result || { id: id, action: action, raw: data, text: readText(data) });
      }
      window.addEventListener('message', onMessage);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ipolloos:ai-runtime:call', id: id, action: action, input: input, context: context, messages: messages }, '*');
      } else {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        reject(new Error('iPolloOS Runtime 未连接'));
      }
    });
  }
  window.iPolloOSAI = { __runtimeBridge: true, call: call };
})();
</script>`;

export function injectRuntimeBridge(html: string): string {
  if (html.includes('window.iPolloOSAI') || html.includes('__runtimeBridge')) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${RUNTIME_BRIDGE_SCRIPT}</body>`);
  return `${html}\n${RUNTIME_BRIDGE_SCRIPT}`;
}

export { RUNTIME_BRIDGE_SCRIPT };
