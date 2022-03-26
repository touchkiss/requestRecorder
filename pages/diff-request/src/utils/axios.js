import Axios from 'axios'
import { Notification } from 'element-ui';

const axios = Axios.create({
    timeout: 20000 // 请求超时 20s
})

//  允许跨域携带cookie信息
axios.defaults.withCredentials = true

// 前置拦截器（发起请求之前的拦截）
axios.interceptors.request.use(
    (config) => {
        /**
         * 根据你的项目实际情况来对 config 做处理
         * 这里对 config 不做任何处理，直接返回
         */
        return config
    },
    (error) => {
        console.log(error)
        // Notification.error({
        //     title: '发送请求错误',
        //     message: error
        // });
        return Promise.reject(error)
    }
)

// 后置拦截器（获取到响应时的拦截）
axios.interceptors.response.use(
    (response) => {
        /**
         * 根据你的项目实际情况来对 response 和 error 做处理
         * 这里对 response 和 error 不做任何处理，直接返回
         */
        return response
    },
    (error) => {
        console.log(error)
        // Notification.error({
        //     title: '发送请求错误',
        //     message: error
        // });
        return Promise.reject(error)
    }
)

export default axios
