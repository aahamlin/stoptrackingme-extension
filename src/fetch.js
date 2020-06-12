/* get text from a url */

function fetchUrl(url, callbackFn) {
    var xhr
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if(xhr.status === 0 || (xhr.status >= 200 && xhr.status < 400)) {
                //console.warn('OK ' + xhr.status + ' ' + xhr.responseText);
                callbackFn(null, xhr.responseText);
            }
            else {
                //console.warn('Error ' + xhr.status + ' ' + xhr.responseText);
                callbackFn(xhr.status + ': ' + xhr.responseText);
            }
        }
    };
    xhr.open('GET', url, true);
    xhr.send();
}



export default fetchUrl;
