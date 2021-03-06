import { GraphQLClient, gql } from 'graphql-request'
import Arweave from 'arweave'
import Axios from 'axios'
import { decryptBuffer } from '@/util/encrypt'

import { cache } from '@/util/cache'

const arweave = Arweave.init({
  host: process.env.VUE_APP_ARWEAVE_NODE,
  port: 443,
  protocol: 'https',
  timeout: 20000,
  logging: false
})

const graph = new GraphQLClient(process.env.VUE_APP_ARWEAVE_GRAPHQL + '/graphql', { headers: {} })

/** 支持的架构版本，在 env 文件中配置，用逗号分隔每个版本号 */
const SCHEMA_VERSION_SUPPORTED = process.env.VUE_APP_SCHEMA_VERSION_SUPPORTED.split(',').map(item => item.trim()).filter(item => item)

export default {
  /**
   * Get user address based on key file content input
   * 根据密钥文件内容获取用户地址
   * @param {String} key      - 使用 keyFileContent，不是原始文件
   */
  getAddress (key) {
    return new Promise((resolve, reject) => {
      arweave.wallets.jwkToAddress(key).then((address) => {
        resolve(address)
      }).catch(err => {
        reject(err)
      })
    })
  },

  /**
   * 转换 AR 为 Winston
   * @param {} arweave   - AR 币值
   */
  getWinstonFromAr (arprice) {
    return arweave.ar.arToWinston(arprice)
  },

  /**
   * 转换 Winston 为 AR
   * @param {*} winston
   */
  getArFromWinston (winston) {
    return arweave.ar.winstonToAr(winston)
  },

  /**
   * Get transaction detail entirely based on given txid
   * 根据给定的 txid (交易ID) 获取完整的交易明细
   * @param {String} txid     - 交易编号
   */
  async getTransactionDetail (txid) {
    const cached = await cache.getCachedTransactionByTxid(txid)
    if (cached) return cached
    return new Promise((resolve, reject) => {
      arweave.transactions.get(txid).then(async (detail) => {
        // 当获取成功时存入缓存
        await cache.cacheTheTransaction(txid, detail)
        resolve(detail)
      }).catch(err => {
        reject(err)
      })
    })
  },

  /**
   * 提取给定的交易对象中的所有标签
   * @param {Object} transaction
   */
  getTagsByTransaction (transaction) {
    const tags = transaction.get('tags')
    const ret = {}
    for (let i = 0; i < tags.length; i++) {
      const key = tags[i].get('name', { decode: true, string: true })
      const value = tags[i].get('value', { decode: true, string: true })
      ret[key] = value
    }
    return ret
  },

  /**
   * 将 Arweave 交易中 owner 字段的值转换为 Arweave 钱包地址
   * @param {String} owner - Arweave 交易中 owner 字段的值
   * @returns         - Arweave 钱包地址
   */
  async getAddressByOwner (owner) {
    const pubJwk = {
      kty: 'RSA',
      e: 'AQAB',
      n: owner
    }
    return await arweave.wallets.getAddress(pubJwk)
  },

  /**
   * Get user's Arweave Id based on the input wallet address
   * 根据输入的钱包地址获取用户的 Arweave ID
   * @param {String} address  - 用户的钱包地址
   * @param {String} type  - 获取的数据类型，默认为 name
   */
  async getIdByAddress (address, type = 'name') {
    const ls = localStorage || window.localStorage
    const id = JSON.parse(ls.getItem(`id:${address}`))
    if (id) {
      return id
    }

    // GraphQL 查询语句，获取设置 arweave-id 的交易记录
    const query = gql`
      query getId($address: String!, $type: String!) {
        transactions (
          owners: [$address]
          tags: [
            {
              name: "App-Name",
              values: ["arweave-id"]
            },
            {
              name: "Type",
              values: [$type]
            }
          ]
        ) {
          edges {
            node {
              id
              block {
                id,
              }
            }
          }
        }
      }
    `
    // 使用 GraphQL 获取 Ar 链上的交易
    const res = await graph.request(query, { address, type })
    // 遍历找到最新的一笔已确认的交易
    for (const value of res.transactions.edges) {
      if (value.node.block && value.node.block.id) {
        // 获取交易详情
        let detail
        try {
          detail = await this.getTransactionDetail(value.node.id)
          detail.data = Buffer.from(detail.data).toString('utf-8')
        } catch (err) {
          if (err.type !== 'TX_PENDING') throw new Error(err)
        }
        if (!detail) return { type: 'Guest', data: 'Guest' }
        const data = detail.data || 'Guest'
        ls.setItem(`id:${address}`, JSON.stringify({ type: 'User', data }))

        return { type: 'User', data }
      }
    }
    return { type: 'Guest', data: 'Guest' }
  },

  /**
   * Get user's Arweave Avatar based on the input wallet address
   * 根据输入的钱包地址获取用户的 Arweave 头像
   * @param {String} address    - 用户的钱包地址
   */
  async getAvatarByAddress (address) {
    // GraphQL 查询语句，获取设置 arweave-avatar 的交易记录
    const query = gql`
      query getAvatar($address: String!) {
        transactions (
          owners: [$address]
          tags: [
            {
              name: "App-Name"
              values: ["arweave-avatar"]
            }
          ]
        ) {
          edges {
            node {
              id
              block {
                id
              }
            }
          }
        }
      }
    `
    // 使用 GraphQL 获取 Ar 链上的交易
    const res = await graph.request(query, { address })
    // 遍历找到最新的一笔已确认的交易
    for (const value of res.transactions.edges) {
      if (value.node.block && value.node.block.id) {
        // 获取交易详情
        let detail
        try {
          detail = await this.getTransactionDetail(value.node.id)
          detail.data = Buffer.from(detail.data).toString()
        } catch (err) {
          if (err.type !== 'TX_PENDING') throw new Error(err)
        }
        if (!detail) return ''
        return detail.data
      }
    }
    return ''
  },
  /**
   * 获取所有营收统计数据
   * @param {String} address    - 我的地址
   * @param {String} mode       - 查询模式
   * @param {Number} first      - 单页限制
   * @returns                   - 统计结果（数字）
   */
  async getAllPurchasesStats (address, mode, first = 100) {
    const query = gql`
      query getAllPurchasesStats($address: String!, $first: Int, $after: String, $purchaseType: [String!]!, $appName: String!) {
        transactions (
          after: $after,
          first: $first,
          tags: [
            { name: "App-Base-Name", values: [$appName] }
            { name: "Purchase-Type", values: $purchaseType },
            { name: "Contract", values: [$address] }
          ],
          block: { min: 1 }
        ) {
          pageInfo {
            hasNextPage
          }
          edges {
            node {
              id
              recipient
              quantity { ar winston }
              tags { name value }
              block { id }
            }
            cursor
          }
        }
      }
    `
    let purchaseType = []
    switch (mode) {
      case 'sponsors':
        purchaseType = ['Likey-Sponsor']
        break
      case 'donations':
        purchaseType = ['Likey-Donation']
        break
      case 'all':
      default:
        purchaseType = ['Likey-Sponsor', 'Likey-Donation']
        break
    }
    // 使用 GraphQL 获取 Ar 链上的交易
    let count = 0
    let hasNextPage = true
    let after = ''
    while (hasNextPage) {
      const res = await graph.request(query, { address, purchaseType, first, after, appName: process.env.VUE_APP_APP_NAME })
      hasNextPage = res.transactions.pageInfo.hasNextPage
      if (!hasNextPage && res.transactions.edges.length === 0) return 0
      res.transactions.edges.forEach(() => count++)
      after = res.transactions.edges[res.transactions.edges.length - 1].cursor
    }
    return count
  },
  /**
   * 获取所有我购买的
   * @param {String} address    - 我的地址
   * @param {String} mode       - 查询模式
   * @param {Number} first      - 单页限制
   * @param {String} after      - 查询单元指针
   * @returns                   - 购买历史结果
   */
  async getAllPurchases (address, mode, first = 10, after = '') {
    const query = gql`
      query getAllPurchases($address: String!, $first: Int, $after: String, $purchaseType: [String!]!, $appName: String!) {
        transactions (
          owners: [$address],
          after: $after,
          first: $first,
          tags: [
            { name: "App-Base-Name", values: [$appName] }
            { name: "Purchase-Type", values: $purchaseType }
          ],
          block: { min: 1 }
        ) {
          pageInfo {
            hasNextPage
          }
          edges
            {
              node {
                id
                recipient
                quantity { ar winston }
                tags { name value }
                block { id }
              }
              cursor
            }
        }
      }
    `
    let purchaseType = []
    switch (mode) {
      case 'sponsors':
        purchaseType = ['Likey-Sponsor']
        break
      case 'donations':
        purchaseType = ['Likey-Donation']
        break
      case 'all':
      default:
        purchaseType = ['Likey-Sponsor', 'Likey-Donation']
        break
    }
    // 使用 GraphQL 获取 Ar 链上的交易
    const res = await graph.request(query, { address, first, after, purchaseType, appName: process.env.VUE_APP_APP_NAME })
    return res
  },
  /**
   * 获取所有打赏我的
   * @param {String} address    - 我的地址
   * @param {String} mode       - 查询模式
   * @param {Number} first      - 单页限制
   * @param {String} after      - 查询单元指针
   * @returns                   - 收入历史结果
   */
  async getAllSponsorAndDonation (address, mode, first = 10, after = '') {
    const query = gql`
      query getAllSponsorAndDonation($address: String!, $first: Int, $after: String, $purchaseType: [String!]!, $appName: String!) {
        transactions (
          recipients: [$address],
          after: $after,
          first: $first,
          tags: [
            { name: "App-Base-Name", values: [$appName] }
            { name: "Purchase-Type", values: $purchaseType }
          ],
          block: { min: 1 }
        ) {
          pageInfo { hasNextPage }
          edges {
            node {
              id
              owner { address }
              quantity { ar winston }
              tags { name value }
              block { id }
            }
            cursor
          }
        }
      }
    `
    let purchaseType = []
    switch (mode) {
      case 'sponsors':
        purchaseType = ['Likey-Sponsor']
        break
      case 'donations':
        purchaseType = ['Likey-Donation']
        break
      case 'all':
      default:
        purchaseType = ['Likey-Sponsor', 'Likey-Donation']
        break
    }
    // 使用 GraphQL 获取 Ar 链上的交易
    const res = await graph.request(query, { address, first, after, purchaseType, appName: process.env.VUE_APP_APP_NAME })
    return res
  },
  /**
   * 根据用户地址获取动态列表
   * @param {String | String[]} address 查询的用户地址，可以传入单个地址或地址列表
   * @param {String} after 获取指定的 cursor 之后的数据
   * @param {Number} first 一次获取几条数据，默认获取 10 条
   * @param {Boolean} filterNoBlock 不返回没有区块信息的交易，没有区块信息的交易将无法通过 transactions.get 获取。
   */
  async getUserStatusByAddress (address, after = '', first = 10, filterNoBlock = false) {
    const query = gql`
      query getStatus(
        $appName: String!,
        $schemaVersion: [String!]!,
        $addressList: [String!],
        $first: Int,
        $after: String,
      ) {
        transactions(
          first: $first
          after: $after
          owners: $addressList
          tags: [
            { name: "App-Name"        values: [$appName] },
            { name: "Schema-Version"  values: $schemaVersion },
            { name: "Type"            values: ["status"] }
          ]
          block: { min: ${filterNoBlock ? 1 : 0} }
        ) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id
              owner { address }
              tags { name value }
              block { timestamp }
            }
        }
        }
      }
    `
    const addressList = typeof address === 'string' ? [address] : [...address]

    const res = await graph.request(query, {
      appName: process.env.VUE_APP_APP_NAME,
      schemaVersion: SCHEMA_VERSION_SUPPORTED,
      addressList,
      after: after || '',
      first: first || 10
    })

    return res
  },
  /**
   * 直接获取动态列表
   * @param {String} after 获取指定的 cursor 之后的数据
   * @param {Number} first 一次获取几条数据，默认获取 10 条
   * @param {Boolean} filterNoBlock 不返回没有区块信息的交易，没有区块信息的交易将无法通过 transactions.get 获取。
   */
  async getUserStatus (after = '', first = 10, filterNoBlock = false) {
    const query = gql`
      query getStatus(
        $appName: String!,
        $schemaVersion: [String!]!,
        $first: Int,
        $after: String,
      ) {
        transactions(
          first: $first
          after: $after
          tags: [
            { name: "App-Name"        values: [$appName] },
            { name: "Schema-Version"  values: $schemaVersion },
            { name: "Type"            values: ["status"] }
          ]
          block: { min: ${filterNoBlock ? 1 : 0} }
        ) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id
              owner { address }
              tags { name value }
              block { timestamp }
            }
        }
        }
      }
    `
    const res = await graph.request(query, {
      appName: process.env.VUE_APP_APP_NAME,
      schemaVersion: SCHEMA_VERSION_SUPPORTED,
      after: after || '',
      first: first || 10
    })

    return res
  },
  /**
   * 获取动态图片
   * @param {String} txid 交易 id
   * @param {Boolean} isEncrypt 是否解密
   */
  async getImage (txid, isEncrypt) {
    try {
      const transaction = await this.getTransactionDetail(txid, { decode: true, string: true })
      // 获取文件的 mime 类型
      const type = this.getTagsByTransaction(transaction).Type
      // 如果需要，则进行解密
      const data = isEncrypt ? decryptBuffer(transaction.data) : transaction.data
      // 神秘的代码
      const blob = new Blob([data], { type: type || 'image/jpeg' })
      // 创建资源地址
      const url = window.URL || window.webkitURL
      return url.createObjectURL(blob)
    } catch (err) {
      if (err.type !== 'TX_PENDING') throw new Error(err)
      return ''
    }
  },

  getUrlByTxid (txid) {
    return 'https://' + process.env.VUE_APP_ARWEAVE_NODE + '/' + txid
  },

  /**
   * Get audio data based on given txid (transaction id)
   * @param {String} txid(TransactionId)  - 音频的交易地址
   * @param {any} cancelToken - 取消标记（用来取消下载）
   * @param {Function} callback - 如果需要获取加载进度，请使用这个回调方法
   */
  getAudio (txid, isEncrypt, cancelToken, callback) {
    return new Promise((resolve, reject) => {
      // 加载进度回调
      let onDownloadProgress
      if (callback) {
        onDownloadProgress = progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          callback(percentCompleted)
        }
      }
      // get
      Axios.get(this.getUrlByTxid(txid), {
        responseType: 'arraybuffer',
        cancelToken,
        onDownloadProgress
      }).then(res => {
        const type = res.headers['content-type']
        const uint8View = new Uint8Array(res.data)
        const data = isEncrypt ? decryptBuffer(uint8View) : uint8View
        const blob = new Blob([data], { type: type || 'audio/mpeg' })
        const url = window.URL || window.webkitURL
        resolve(url.createObjectURL(blob))
      }).catch(err => {
        reject(err)
      })
    })
  },

  /**
   * 获取文件
   * @param {String} txid(TransactionId)  - 文件的交易地址
   * @param {any} cancelToken - 取消标记（用来取消下载）
   * @param {Function} callback - 如果需要获取加载进度，请使用这个回调方法
   */
  getFile (txid, isEncrypt, cancelToken, callback) {
    return new Promise((resolve, reject) => {
      // 加载进度回调
      let onDownloadProgress
      if (callback) {
        onDownloadProgress = progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          callback(percentCompleted)
        }
      }
      // get
      Axios.get(this.getUrlByTxid(txid), {
        responseType: 'arraybuffer',
        cancelToken,
        onDownloadProgress
      }).then(res => {
        const type = res.headers['content-type']
        const uint8View = new Uint8Array(res.data)
        const data = isEncrypt ? decryptBuffer(uint8View) : uint8View
        const blob = new Blob([data], { type: type || 'audio/mpeg' })
        const url = window.URL || window.webkitURL
        resolve(url.createObjectURL(blob))
      }).catch(err => {
        reject(err)
      })
    })
  },
  /**
   * 通过交易ID获取动态列表
   * @param txid            - 交易ID，可传入字符串数组
   * @param first           - 分页限制
   * @param after           - 指定cursor，可获取cursor之后的数据
   * @param filterNoBlock   - 过滤没有block的交易
   * @return {Promise<any>} - 动态列表
   */
  async getStatusByTxid (txid, first = 10, after, filterNoBlock = false) {
    const query = gql`
    query getStatus(
      $appName: String!,
      $schemaVersion: [String!]!,
      $ids: [ID!],
      $first: Int,
      $after: String,
    ) {
      transactions(
        first: $first
        after: $after
        ids: $ids
        tags: [
          { name: "App-Name"        values: [$appName] },
          { name: "Schema-Version"  values: $schemaVersion },
          { name: "Type"            values: ["status"] }
        ]
      ) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            owner { address }
            tags { name value }
            block { timestamp }
         }
        }
      }
    }
  `
    const txidList = typeof txid === 'string' ? [txid] : [...txid]
    const res = await graph.request(query, {
      appName: process.env.VUE_APP_APP_NAME,
      schemaVersion: process.env.VUE_APP_SCHEMA_VERSION_SUPPORTED,
      ids: txidList,
      first: first,
      after: after
    })
    if (filterNoBlock) {
      const edges = res.transactions.edges.filter(item => {
        return item.node.block && item.node.block.timestamp
      })
      res.transactions.edges = edges
    }
    return res
  },
  /**
   * 获取指定用户赞赏的动态
   * @param address       - 用户地址
   * @param first         - 分页限制
   * @param after         - 传入cursor，可获取指定cursor之后的内容
   * @param filterNoBlock - 是否过滤掉没有block的内容
   * @return {Promise<*>} - 动态列表
   */
  async getSponsoredStatus (address, first = 10, after, filterNoBlock = false) {
    const sponsoredStatusTxidList = []
    try {
      const purchases = await this.getAllPurchases(address, 'donations')
      purchases.transactions.edges.forEach((edge) => {
        const donateStatus = edge.node.tags.find((it) => it.name === 'Donate-Status')
        if (donateStatus) sponsoredStatusTxidList.push(donateStatus.value)
      })
    } catch (e) {
      console.error(e)
    }
    return await this.getStatusByTxid(sponsoredStatusTxidList, first, after, filterNoBlock)
  }
}
