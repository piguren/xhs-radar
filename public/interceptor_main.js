// xhs-radar MAIN world interceptor (T-061)
// 注入小红书页面的真实环境，劫持 fetch + XHR，捕获 search/feed/user 接口响应。
// 通过 window.postMessage 把数据投递给同源的 ISOLATED world content script。
// IIFE，不能 import 任何模块。路径常量必须内联。

(function () {
  if (window.__xhs_radar_intercepted__) return;
  window.__xhs_radar_intercepted__ = true;

  var SEARCH_PATH = '/api/sns/web/v1/search/notes';
  var FEED_PATH = '/api/sns/web/v1/feed';
  var USER_INFO_PATH = '/api/sns/web/v1/user/otherinfo';

  function endpointFor(url) {
    if (typeof url !== 'string') return null;
    if (url.indexOf(SEARCH_PATH) !== -1) return 'search';
    if (url.indexOf(FEED_PATH) !== -1) return 'feed';
    if (url.indexOf(USER_INFO_PATH) !== -1) return 'user_info';
    return null;
  }

  function dispatch(endpoint, payload) {
    try {
      window.postMessage({ __xhs_radar: 'CAPTURED', endpoint: endpoint, payload: payload }, '*');
    } catch (e) {
      // ignore
    }
  }

  // === fetch hook ===
  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      var response = await origFetch(input, init);
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var ep = endpointFor(url);
        if (ep) {
          response.clone().json().then(function (data) {
            dispatch(ep, data);
          }).catch(function () { /* not json, ignore */ });
        }
      } catch (e) { /* ignore */ }
      return response;
    };
  }

  // === XHR hook ===
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__xhs_url = typeof url === 'string' ? url : (url && url.toString && url.toString()) || '';
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var self = this;
    this.addEventListener('load', function () {
      var ep = endpointFor(self.__xhs_url);
      if (!ep) return;
      try {
        var data = JSON.parse(self.responseText);
        dispatch(ep, data);
      } catch (e) { /* not json, ignore */ }
    });
    return origSend.apply(this, arguments);
  };

  // signal readiness for debugging
  console.log('[xhs-radar] MAIN-world interceptor active');
})();
