<template>
  <div id="app">
    <main class="main-container">
      <div class="top">
        <div class="header">
          <h1>
            diffRequest
          </h1>
          <el-switch
              style="display: block"
              v-model="recording"
              active-color="#fff000"
              inactive-color="#ff4949"
              @change="toggleRecorder"
              :inactive-text="recording?'正在录制':'不在录制'">
          </el-switch>
        </div>
      </div>

      <div class="bottom">
        <div class="right">
          <el-row :gutter="10">
            <el-col :span="6">
              <el-card class="box-card" shadow="hover">
                <transition name="el-zoom-in-top">
                  <div class="card-header" v-show="allRequest.length">
                    <h3>Request List<i class="el-icon-refresh" @click="loadFromChrome">重新导入</i></h3>
                    <el-row>
                      <el-col :span="24">
                        <el-input type="text" v-model="urlRegex"
                                  placeholder="输入regex过滤"></el-input>
                      </el-col>
                    </el-row>
                  </div>
                </transition>
                <el-empty v-if="!allRequest.length" description="请先录制请求"></el-empty>
                <transition name="el-zoom-in-top">
                  <el-table v-show="allRequest.length"
                            :data="filteredRequest"
                            highlight-current-row style="width: 100%"
                            :max-height="screenHeight-260+'px'"
                            @current-change="handleCurrentChange"
                            @selection-change="handleSelectionRequestsChange">
                    <el-table-column type="selection" width="30"></el-table-column>
                    <el-table-column label="url" header-align="center" prop="requestUrl"></el-table-column>
                    <el-table-column prop="method" label="method"
                                     align="right" width="100">
                      <!--                                     :filters="methodFilter" :filter-method="filterMethod"-->
                      <template #default="props">
                        <el-tooltip class="item" effect="dark" content="复制http请求" placement="right">
                          <i class="el-icon-s-order" @click="copyToClipboard(props.row,props.row.host)"></i>
                        </el-tooltip>
                      </template>
                    </el-table-column>
                  </el-table>
                </transition>
                <el-row class="mb-4" style="margin-top: 10px" v-if="allRequest.length&&selectedRequest.length"
                        :gutter="10">
                  <el-col :span="12" align="center">
                    <el-button type="danger" @click="deleteRequest" round>删除</el-button>
                  </el-col>
                  <el-col :span="12" align="center">
                    <el-dropdown @command="exportRequest">
                      <el-button type="success" round>
                        导出<i class="el-icon-arrow-down el-icon--right"></i>
                      </el-button>
                      <el-dropdown-menu>
                        <el-dropdown-item command="http">http</el-dropdown-item>
                        <el-dropdown-item command="postman">postman</el-dropdown-item>
                      </el-dropdown-menu>
                    </el-dropdown>
                  </el-col>
                </el-row>
              </el-card>
            </el-col>
            <transition name="el-zoom-in-top">
              <el-col :span="18" v-show="allRequest.length">
                <el-card class="box-card" shadow="hover">
                  <el-row>
                    <el-col :span="24">
                      <h3 text-gray-600>
                        {{
                          (curRequest && curRequest.url) ? (curRequest.method + ':' + curRequest.requestUrl) : '请在左侧选择要测试的request'
                        }}
                      </h3>
                    </el-col>
                  </el-row>
                  <el-row :gutter="10" class="content-row">
                    <el-col :span="12">
                      <el-input type="text" :value="(curRequest&&curRequest.host)||''"
                                placeholder="main host"></el-input>
                    </el-col>
                    <el-col :span="12">
                      <el-input type="text" v-model="compareHost"
                                placeholder="compare host"></el-input>
                    </el-col>
                  </el-row>
                  <el-row class="content-row">
                    <el-col :span="24" align="center">
                      <el-collapse v-model="activeNames">
                        <el-collapse-item title="request headers" name="1">
                          <el-table :data="(curRequest&&curRequest.headers)||[]" style="width: 100%"
                                    max-height="400">
                            <el-table-column width="200" label="name" header-align="center">
                              <template #default="props">
                                <el-input :span="12" type="text" v-model="props.row.name" placeholder="header name"/>
                              </template>
                            </el-table-column>
                            <el-table-column label="value" header-align="center">
                              <template #default="props">
                                <el-input type="text" v-model="props.row.value" placeholder="header value"/>
                              </template>
                            </el-table-column>
                          </el-table>
                        </el-collapse-item>
                        <el-collapse-item title="request body" name="2">
                          <el-input
                              v-model="curRequest.requestBody"
                              :rows="5"
                              type="textarea"
                              placeholder="Request Body"
                          />
                        </el-collapse-item>
                      </el-collapse>
                    </el-col>
                  </el-row>
                  <el-row class="content-row">
                    <el-col :span="24" align="center">
                      <el-button-group v-if="curRequest && curRequest.url">
                        <el-tooltip class="item" effect="dark" content="复制main host的http请求体" placement="top">
                          <el-button type="primary" @click="copyToClipboard(curRequest,curRequest.host)">main
                          </el-button>
                        </el-tooltip>
                        <el-button type="danger" @click="sendAndCompare(undefined,undefined)" round v-loading="sending">
                          发送
                        </el-button>
                        <el-tooltip class="item" effect="dark" content="复制compare host的http请求体" placement="top">
                          <el-button type="primary" @click="copyToClipboard(curRequest,compareHost)"
                                     title="复制compare host的http请求体"> comp
                          </el-button>
                        </el-tooltip>
                      </el-button-group>
                    </el-col>
                  </el-row>
                  <el-row class="content-row">
                    <el-col :span="24">
                      <json-diff v-if="finishCompare&&!showHttp" :jsonSourceLeft="leftData"
                                 :jsonSourceRight="rightData"/>
                      <el-input
                          :value="JSON.stringify(curResponseBody,null,2)"
                          v-if="!finishCompare&&!showHttp"
                          :rows="20"
                          type="textarea"
                          placeholder="Response body"
                      />
                      <el-input
                          v-model="httpText"
                          v-if="showHttp"
                          :rows="20"
                          type="textarea"
                          id="httpText"
                          placeholder="Response body"
                      />
                    </el-col>
                  </el-row>
                </el-card>
              </el-col>
            </transition>
          </el-row>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import JsonDiff from 'vue-json-diff'
import axios from "./utils/axios"

export default {
  name: 'App',
  data() {
    return {
      storedRequests: [],
      allRequest: [],
      filteredRequest: [],
      screenWidth: window.clientWidth,
      screenHeight: window.innerHeight,
      selectedRequest: [],
      curRequest: {},
      compareHost: localStorage.getItem('compareHost') || '',
      activeNames: ['2'],
      multipleHeadsersRef: {},
      headersSelected: [],
      leftData: {},
      rightData: {},
      finishCompare: false,
      curResponseBody: {},
      urlRegex: localStorage.getItem('urlRegex') || /[htps]+:\/\/[\S]*/,
      recording: false,
      updateRecording: '',
      methodFilter: [
        {text: 'GET', value: 'GET'},
        {text: 'POST', value: 'POST'},
        {text: 'OPTIONS', value: 'OPTIONS'},
        {text: 'PUT', value: 'PUT'},
        {text: 'DELETE', value: 'DELETE'},
        {text: 'PATCH', value: 'PATCH'},
        {text: 'HEAD', value: 'HEAD'},
      ],
      showHttp: false,
      httpText: "",
      sending: false
    }
  },
  components: {
    JsonDiff,
    // VueJsonPretty
  },
  mounted() {
    const that = this
    window.onresize = () => {
      return (() => {
        that.screenWidth = window.clientWidth
        that.screenHeight = window.innerHeight
      })()
    }
    this.loadFromChrome()
    this.updateRecording = setInterval(() => {
      chrome.runtime.sendMessage({
        type: 'recordingRequest'
      }, obj => {
        this.recording = obj.recordingRequest
      });
    }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.updateRecording)
  },
  watch: {
    urlRegex() {
      this.filteredRequest = this.allRequest.filter(item => {
        return item.url && item.url.match(this.urlRegex)
      });
      localStorage.setItem('urlRegex', this.urlRegex);
    },
    compareHost() {
      localStorage.setItem('compareHost', this.compareHost);
    }
  },
  methods: {
    copyToClipboard(request, host) {
      let tempRequest = {...request};
      tempRequest['host'] = host;
      tempRequest['url'] = host + tempRequest['requestUrl'];
      this.httpText = this.constructHttpFileContent([tempRequest])
      this.showHttp = true;
      setTimeout(() => {
        let httpText = document.getElementById('httpText');
        httpText.select();
        document.execCommand("Copy");
        this.$message({
          message: '已将http请求复制到剪贴板',
          type: 'success'
        });
      }, 500);
    },
    loadFromChrome() {
      // this.allRequest = this.storedRequests;
      chrome.runtime.sendMessage({
        type: 'loadAllRequest'
      }, obj => {
        // this.allRequest = this.storedRequests.concat(obj.requests);
        this.allRequest = obj.requests
        // console.log(JSON.stringify(this.allRequest));
        if (obj.requests.length) {
          this.$message({
            message: '已重新加载所有请求',
            type: 'success'
          });
        } else {
          this.$message({
            message: '没有记录，请先录制请求',
            type: 'success'
          });
        }
        this.filteredRequest = this.allRequest.filter(item => {
          return item.url && item.url.match(this.urlRegex)
        })
      });
    },
    toggleRecorder() {
      chrome.runtime.sendMessage({
        type: 'toggleRecorder',
      }, obj => {
        console.log(obj)
        setTimeout(() => {
          if (!this.recording) {
            this.loadFromChrome();
          }
        }, 1000);
      });
    },
    regexUrl(url) {
      return url.replace(/[htps]+:\/\/[a-zA-Z0-9-\.]+/g, "");
    },
    regexHost(url) {
      let hosts = url.match(/[htps]+:\/\/[a-zA-Z0-9-\.]+/g)
      return hosts ? hosts[0] : ''
    },
    filterMethod(value, row, column) {
      return value === row['method']
    },
    handleCurrentChange(value) {
      this.curRequest = value || {}
      // this.curRequest = this.curRequest.requestBody || ''
    },
    async sendAndCompare(preResponse = undefined, compHost = undefined) {
      this.sending = true;
      this.showHttp = false
      this.finishCompare = false
      let requestBody = ''
      console.log(123)
      let contentType = this.curRequest.headers.filter((header) => header.name === 'Content-Type')[0]
      if (!contentType){
        requestBody=''
      }else if (contentType['value'].match('application/x-www-form-urlencoded')) {
        requestBody = this.curRequest.requestBody
      } else if (contentType['value'].match('application\/json')) {
        requestBody = JSON.parse(this.curRequest.requestBody)
      } else {
        requestBody = this.curRequest.requestBody
      }
      console.log(requestBody)
      let headers = {}
      this.curRequest.headers.forEach((header) => {
        headers[header.name] = header.value
      })
      await axios({
        method: this.curRequest.method.toLowerCase(),
        url: (compHost || this.curRequest.host) + (this.curRequest.requestUrl||''),
        data: requestBody,
        headers: headers
      }).then(res => {
        console.log(res)
        if (res.status === 200) {
          if (preResponse) {
            this.leftData = preResponse
            this.rightData = res.data
            this.finishCompare = true
            this.sending = false
            console.log('compare complete,preResponse:', preResponse, ',curResponse:', res.data)
          } else if (this.compareHost && this.compareHost !== '') {
            console.log('compare host', this.compareHost)
            this.sendAndCompare(res.data, this.compareHost)
          } else {
            //  无compareHost
            console.log('无compareHost')
            this.finishCompare = false
            this.curResponseBody = res.data
            this.sending = false
          }
        }
      }).catch((error) => {
        this.$notify.error({
          title: '发送请求错误',
          message: 'url:' + (compHost || this.curRequest.host) + this.curRequest.requestUrl
        });
        console.error(error)
        this.sending = false
      })
    },
    handleSelectionRequestsChange(requests) {
      this.selectedRequest = requests
    },
    deleteRequest() {
      if (this.selectedRequest && this.selectedRequest.length) {
        this.selectedRequest.forEach(request => {
          this.allRequest.forEach(item => {
            if (item.uuid === request.uuid) {
              this.allRequest.splice(this.allRequest.indexOf(item), 1)
            }
          })
        })
        this.filteredRequest = this.allRequest.filter(item => {
          return item.url && item.url.match(this.urlRegex)
        })
        chrome.runtime.sendMessage({
          type: 'setRequests',
          requests: this.allRequest
        }, obj => {
        });
        this.$message({
          message: '删除成功',
          type: 'success'
        });
      }
    },
    exportRequest(exportType) {
      // chrome.runtime.sendMessage({
      //   type: 'exportRequest',
      //   requests: this.selectedRequest,
      //   exportType: exportType
      // }, obj => {
      // });
      this.exportRequests(this.selectedRequest, exportType)
    },
    handleSelectionHeadersChange(headers) {
      this.headersSelected.value = headers
      console.log('handleSelectionHeadersChange', this.headersSelected)
    },
    formatDate(date) {
      let Y = date.getFullYear() + '-';
      let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
      let D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
      let h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
      let m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
      let s = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
      return Y + M + D + h + m + s;
    },
    exportRequests(requests, type) {
      let defaultExportFileName = requests.length + '个webRequest导出-' + this.formatDate(new Date());
      switch (type) {

        case 'http':
          this.downloadFile(this.constructHttpFileContent(requests), defaultExportFileName + ".http", 'utf-8');
          break;
        case 'postman':
          this.downloadFile(this.constructPostmanExportContent(false, requests), defaultExportFileName + ".json", 'utf-8');
          break;
      }
    },
    downloadFile(data, fileName, charset) {
      // console.log('downloadFile', data, fileName, charset, tabId);
      // executeJs(tabId, (data, fileName, charset) => {
      let elementA = document.createElement('a');
      elementA.setAttribute('href', `data:text/plain;charset=${charset || 'utf-8'},${data}`);
      elementA.setAttribute('download', fileName);
      elementA.style.display = 'none';
      document.body.appendChild(elementA);
      elementA.click();
      document.body.removeChild(elementA);
      // }, [data, fileName, charset]);
    },
    constructHttpFileContent(requests) {
      return requests.map(request => {
        return `${request.method.toUpperCase()} ${request.url}\n${request.headers.map(header => header.name + ':' + header.value).join('\n')}\n\n${request.requestBody}`;
      }).join('\n\n%23%23%23\n');
    },
    constructPostmanExportContent(requests) {
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
  }
}
</script>

<style>
body {
  background: #d3d3d3;
}

.header {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
  font-weight: bold;
}

.main-container {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: lightgray;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.main-container .top {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 60px;
  margin-bottom: 10px;
}

.main-container .bottom {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
}

.main-container .bottom .left {
  position: relative;
  width: 80px;
  height: 100%;
  box-sizing: border-box;
}

.main-container .bottom .right {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0 10px 10px 10px;
}

.main-container .bottom .right .content {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  box-sizing: border-box;
  padding: 10px;
}

.page-links a {
  font-weight: bold;
  margin: 0 20px;
}

.content-row {
  margin-bottom: 10px;
}

#pageContainer {
  min-height: 500px;
}

.wp-json .panel-body {
  min-height: 400px;
  overflow: auto;
}

i {
  cursor: pointer;
}
</style>
