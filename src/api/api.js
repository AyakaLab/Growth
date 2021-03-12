import arql from './arql'
import gql from './graphql'
import ArweaveUtil from 'arweave'
import backend from './backend'

const ArweaveNative = ArweaveUtil.init({
  host: process.env.VUE_APP_ARWEAVE_NODE,
  port: 443,
  protocol: 'https',
  timeout: 20000,
  logging: false
})

const API = {
  /** 封装过的 arweave API（用的是新的 GraphQL） */
  gql,
  /** 封装过的 arweave API（用的是老的 ArQL） */
  arql,
  /** 初始化完成的原始 Arweave API（不包含任何封装和 GraphQL） */
  ArweaveNative: ArweaveNative,
  /** Arweave 工具集，包含 crypto，util 等快速转换和加密方法 */
  ArweaveUtil: ArweaveUtil,
  /** Growth 后端 API 集合 */
  be: backend
}

export default API
