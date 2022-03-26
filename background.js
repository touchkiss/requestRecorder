let MessageTypes = {
    "openDiffRequestTab": "openDiffRequestTab",
    "loadAllRequest": "loadAllRequest",
    "setRequests": "setRequests",
    "exportRequest": "exportRequest",
    "recordingRequest": "recordingRequest",
    "toggleRecorder": "toggleRecorder",
}
const ALL_REQUEST = {};
const URL_CATCH_FILTER = '*://*/*';
let recordRequestRegex = /[htps]+:\/\/[\S]/;
let recordingRequest = false;
let recordedRequests = [];

let genUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let ab2str = buf => {
    return String.fromCharCode.apply(null, new Uint8Array(buf)); //apply将数组参数传给方法作为分开的实参，见apply的用法
}

let uintToString = uintArray => {
    var encodedString = String.fromCharCode.apply(null, new Uint8Array(uintArray)),
        decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
}

/**
 * 下载文件
 * @param data
 * @param fileName
 * @param charset
 * @param tabId
 */
let downloadFile = (data, fileName, charset, tabId) => {
    console.log('downloadFile', data, fileName, charset, tabId);
    executeJs(tabId, (data, fileName, charset) => {
        let elementA = document.createElement('a');
        elementA.setAttribute('href', `data:text/plain;charset=${charset || 'utf-8'},${data}`);
        elementA.setAttribute('download', fileName);
        elementA.style.display = 'none';
        document.body.appendChild(elementA);
        elementA.click();
        document.body.removeChild(elementA);
    }, [data, fileName, charset]);
}

let formatDate = date => {
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    let h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    let m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
    let s = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
    return Y + M + D + h + m + s;
}

/**
 * 拼装.http文件内容
 * @returns {string}
 */
let constructHttpFileContent = (requests) => {
    return requests.map(request => {
        return `${request.method.toUpperCase()} ${request.url}\n${request.headers.map(header => header.name + ':' + header.value).join('\n')}\n\n${request.requestBody}`;
    }).join('\n\n%23%23%23\n');
}

/**
 * 拼装postman导出数据
 * @param forDeepTest
 * @returns {string}
 */
let constructPostmanExportContent = (requests) => {
    let data = {
        info: {
            schema: "https://schema.getpostman.com/json/collection/v2.0.0/collection.json"
        },
        item: []
    }
    requests.forEach(request => {
        data['item'].push({
            name: request.url,
            request: {
                url: request.url,
                method: request.method.toUpperCase(),
                header: request.headers.map(header => {
                    return {
                        key: header.name,
                        value: header.value,
                        type: 'text'
                    }
                }),
                body: {
                    mode: 'raw',
                    raw: request.requestBody
                }
            }
        })
    })
    return JSON.stringify(data);
}

let executeJs = (tabId, func, args) => {
    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: func,
        args: args
    });
}

let initMessageListener = () => {
    chrome.runtime.onMessage.addListener(function (request, sender, callback) {
        //提取配置项
        if (!request.type) {
            return;
        }
        switch (request.type) {
            case MessageTypes.openDiffRequestTab:
                chrome.tabs.create({
                    url: 'pages/diff-request/dist/index.html'
                })
                callback({
                    message: '收到消息：' + request.type,
                    type: MessageTypes.openDiffRequestTab
                });
                break;
            case MessageTypes.openDiffJsfTab:
                chrome.tabs.create({
                    url: 'pages/diff-jsf/dist/index.html'
                })
                callback({
                    message: '收到消息：' + request.type,
                    type: MessageTypes.openDiffJsfTab
                });
                break;
            case MessageTypes.loadAllRequest:
                callback({
                    requests: recordedRequests,
                    type: MessageTypes.loadAllRequest
                })
                break;
            case MessageTypes.setRequests:
                recordedRequests = request.requests
                if (sender.tab) {
                    chrome.action.setBadgeText(
                        {
                            tabId: sender.tab.id,
                            text: (recordedRequests.length || '') + ''
                        }
                    );
                }
                callback({})
                break;
            case MessageTypes.exportRequest:
                exportRequests(request.requests || recordedRequests, request.exportType, sender.tab.id)
                callback({})
                break;
            case MessageTypes.recordingRequest:
                callback({
                    recordingRequest: recordingRequest,
                    type: MessageTypes.toggleRecorder
                })
                break;
            case MessageTypes.toggleRecorder:
                recordingRequest = !recordingRequest;
                callback({
                    recordingRequest: recordingRequest,
                    type: MessageTypes.toggleRecorder
                })
                break;
        }
    })
}

let exportRequests = (requests, type, tabId) => {
    let defaultExportFileName = requests.length + '个webRequest导出-' + formatDate(new Date());
    switch (type) {
        case 'http':
            downloadFile(constructHttpFileContent(requests), defaultExportFileName + ".http", 'utf-8', tabId);
            break;
        case 'postman':
            downloadFile(constructPostmanExportContent(requests), defaultExportFileName + ".json", 'utf-8', tabId);
            break;
    }
}

/**
 * 初始化webRequest Recorder
 */
let initWebRequestRecoder = () => {
    chrome.webRequest.onBeforeSendHeaders.addListener(details => {
        // console.log("这里是监听器onBeforeSendHeaders：", details);
        if (recordingRequest && details.url.match(recordRequestRegex) && (details.method === 'POST' || details.method === 'GET')) {
            let headerMap = {};
            let headers = [];
            details.requestHeaders.forEach(header => {
                let head = JSON.parse(JSON.stringify(header));
                headerMap[head.name] = head.value;
                headers.push({
                    name: head.name,
                    value: head.value
                });
            })
            let requestBody;
            if (headerMap['Content-Type'] && headerMap['Content-Type'].match('application/x-www-form-urlencoded')) {
                let formItems = [];
                let formData = ALL_REQUEST[details.requestId].requestBody.formData;
                for (let item in formData) {
                    formItems.push(item + '=' + formData[item].join(','));
                }
                requestBody = formItems.join('&');
            } else if (headerMap['Content-Type'] && headerMap['Content-Type'].match('application\/json')) {
                requestBody = JSON.stringify(JSON.parse(uintToString(ALL_REQUEST[details.requestId].requestBody.raw[0].bytes)), null, 2);
            }
            recordedRequests.push({
                url: details.url,
                type: details.type,
                requestUrl: details.url.replace(/[htps]+:\/\/[a-zA-Z0-9-\.]+/g, ""),
                host: details.url.match(/[htps]+:\/\/[a-zA-Z0-9-\.]+/g)[0],
                method: details.method,
                headers: headers,
                timestamp: details.timeStamp,
                requestBody: requestBody,
                uuid: genUuid()
            });
            chrome.action.setBadgeText({
                tabId: details.tabId,
                text: recordedRequests.length + ''
            })

            ALL_REQUEST[details.requestId] = null;
        }
    }, {urls: [URL_CATCH_FILTER]}, ['extraHeaders', 'requestHeaders']);
    chrome.webRequest.onCompleted.addListener(details => {
    }, {urls: [URL_CATCH_FILTER]}, ['extraHeaders', 'responseHeaders']);
    chrome.webRequest.onBeforeRequest.addListener(details => {
        if (recordingRequest && details.url.match(recordRequestRegex) && (details.method === 'POST' || details.method === 'GET')) {
            ALL_REQUEST[details.requestId] = {
                requestBody: details.requestBody,
                url: details.url,
                method: details.method
            }
            // console.log("这里是监听器onBeforeRequest：", redirect.redirectUrl);
            // return redirect;
        }
    }, {urls: [URL_CATCH_FILTER]}, ['requestBody', 'extraHeaders']);
}

initWebRequestRecoder();
initMessageListener();
