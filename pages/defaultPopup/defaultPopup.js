$(() => {
    let refreshRecordState = () => {
        chrome.runtime.sendMessage({
            type: MessageTypes.recordingRequest
        }, obj => {
            console.log(obj)
            $("#toggleRecorder").text(obj.recordingRequest ? '停止录制' : '开始录制');
        })
    }
    refreshRecordState();
    setTimeout(() => {
        refreshRecordState();
    }, 1000);
    $("#diffRequest").click(() => {
        chrome.runtime.sendMessage({
            type: MessageTypes.openDiffRequestTab
        }, obj => {
            console.log(obj)
        });
    });
    $("#toggleRecorder").click(() => {
        chrome.runtime.sendMessage({
            type: MessageTypes.toggleRecorder
        }, obj => {
            refreshRecordState();
            console.log(obj)
        });
    });
    $(".exportRequest").click(function () {
        let exportType = $(this).data("type")
        chrome.runtime.sendMessage({
            type: MessageTypes.exportRequest,
            exportType: exportType,
            requests: undefined
        }, obj => {
            console.log(obj)

        });
    });
    $("#clearAllRequest").click(() => {
        chrome.runtime.sendMessage({
            type: MessageTypes.setRequests,
            requests: []
        }, obj => {
            console.log(obj)
        });
    })
})
