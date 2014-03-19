$(document).ready(function($) {
    $('body').on('click','.install-link',function(){
        var url = $(this).attr('link');
        if (window.location.host.indexOf('beepe.me')>=0 && window.chrome && window.chrome.webstore) chrome.webstore.install(url);
        else {
            window.open(url, '_blank');
        }
    });

    var iframeUrl;
    var params = parseQueryString();
    if (params.r)
        iframeUrl = '/dcr/' + params.r[0];
    else
        iframeUrl = '/';

    if (isMobile()) {
        window.location = iframeUrl;
    } else {
        $('.iframe-colabeo-dashboard').attr('src',iframeUrl);
    }

});

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
};

function parseQueryString() {
    var query = (window.location.search || '?').substr(1),
        map   = {};
    query.replace(/([^&=]+)=?([^&]*)(?:&+|$)/g, function(match, key, value) {
        (map[key] = map[key] || []).push(value);
    });
    return map;
}