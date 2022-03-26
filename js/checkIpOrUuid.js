//获取url中的参数
function getUrlParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r = window.location.search.substr(1).match(reg);  //匹配目标参数
    if (r != null) return unescape(r[2]);
    return null; //返回参数值
}

$(() => {
    var ips = getUrlParam("ips");
    if (ips && ips.length) {
        $("#ips").val(ips);
    }
    preCheckIps(ips);
    $("#checkIpOrUuid").click(() => {
        preCheckIps($("#ips").val());
    })
})

function preCheckIps(ipText) {
    var ips = ipText.split(/[\n,，]+/g);
    var finalIps = [];
    ips.forEach(ip => {
        if (ip.match(/[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}/)) {
            finalIps.push(ip);
        } else if (ip.match(/[\da-zA-Z]{8}-[\da-zA-Z]{4}-[\da-zA-Z]{4}-[\da-zA-Z]{4}-[\da-zA-Z]{12}/)) {
            finalIps.push(ip);
        }
    });
    if (finalIps.length) {
        $("#tableArea").empty();
        checkIpOrUuid(finalIps, 0, [],new Set([]));
    } else {
        alert("不包含合法的ip地址或UUID")
    }
}

function checkIpOrUuid(ips, index, result,uuids) {
    $.ajax({
        "url": `http://console.jdos.jd.com/api/ops/cluster/ips_or_uuids?ips=${ips[index]}`,
        "type": "GET",
        "dataType": "json",
        "async": true,
        "data": {},
        "success": (data) => {
            if (data && data.success && data.data && data.data.length) {
                if(!uuids.has(data.data[0].uuid)){
                    result.push(data.data[0]);
                    uuids.add(data.data[0].uuid);
                }
            }
            if (index < ips.length - 1) {
                checkIpOrUuid(ips, index + 1, result,uuids);
            } else {
                $("#tableArea").append($(`<div class="panel-body">
            <table id="ipTable" class="table table-striped table-bordered">
                <thead>
                <tr>
                    <td>容器ID</td>
                    <td>容器名</td>
                    <td>容器IP</td>
                    <td>容器规格</td>
                    <td>磁盘规格</td>
                    <td>系统</td>
                    <td>应用</td>
                    <td>分组</td>
                    <td>机房</td>
                    <td>zone</td>
                    <td>应用负责人</td>
                    <td>部门</td>
                </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>`));
                result.forEach(machine => {
                    var tbody = $("#ipTable tbody");
                    var tr = $("<tr></tr>").appendTo($(tbody));
                    $(tr).append($(`<td>${machine.uuid}</td>`))
                        .append(`<td>${machine.podName}</td>`)
                        .append(`<td>${machine.podIp}</td>`)
                        .append(`<td>${machine.vcpus}C${machine.memoryMb}MB</td>`)
                        .append(`<td>${machine.diskGb}GB</td>`)
                        .append(`<td><a href="http://console.jdos.jd.com/#/system/${machine.systemName}/appHome">${machine.systemName}</a></td>`)
                        .append(`<td><a href="http://console.jdos.jd.com/#/apps/${machine.systemName}/${machine.appName}/detail">${machine.appName}</a></td>`)
                        .append(`<td><a href="http://console.jdos.jd.com/#/${machine.systemName}/${machine.appName}/group/${machine.groupName}">${machine.groupName_cn}(${machine.groupName})</a></td>`)
                        .append(`<td>${machine.regionCn}</td>`)
                        .append(`<td>${machine.zone}</td>`)
                        .append(`<td>${machine.app.username}</td>`)
                        .append(`<td>${machine.app.fullDeptName}</td>`);
                })
                $("#ipTable").DataTable({
                    'searching': true,
                    'scrollX': true,
                    'language': {
                        'url': 'js/Chinese.json'
                    }
                })
            }
        },
        "error": () => {
        }
    });
}
