<template>
  <div
    class="setting"
    v-loading="initLoading || submitting"
    :element-loading-text="submitTips"
  >
    <div v-if="newAuthor" class="setting-header">
      <h3>
        2. {{ $t('setting.tokenSettings') }}
      </h3>
    </div>
    <SettingNav v-else />
    <div class="setting-creator">
      <div class="setting-creator-item" v-if="!newAuthor">
        <h4>
          {{ $t('setting.contractAddress') }}
        </h4>
        <div class="setting-creator-item-contract">
          <span class="setting-creator-item-contract-address">{{ tickerContract || 'Invalid Contract' }}</span>
          <span class="mdi mdi-content-copy copy-icon" @click="() => copyContractAddress(tickerContract)" />
        </div>
      </div>
      <!-- 名称 -->
      <div class="setting-creator-item">
        <h4>
          {{ $t('setting.inputName') }}
        </h4>
        <div class="setting-creator-item-input">
          <el-input v-model="name" :placeholder="$t('setting.inputNamePlaceholder')" :disabled="!newAuthor" />
        </div>
        <p class="setting-creator-item-desp">
          {{ $t('setting.canNotBeModified') }}
        </p>
      </div>
      <!-- 缩写 -->
      <div class="setting-creator-item">
        <h4>
          {{ $t('setting.ticker') }}
        </h4>
        <div class="setting-creator-item-input">
          <el-input v-model="tickerInput" :placeholder="$t('setting.tickerPlaceholder')" :disabled="!newAuthor" />
        </div>
        <p class="setting-creator-item-desp">
          {{ $t('setting.canNotBeModified') }}
        </p>
      </div>
      <!-- 兑换比率 -->
      <div class="setting-creator-item">
        <h4>
          {{ $t('setting.exchangeRatio') }}
        </h4>
        <div class="setting-creator-item-input">
          <span class="setting-creator-item-input-pst-ratio">1 {{ ticker || 'PST' }} =</span>
          <div class="setting-creator-item-input-ratio">
            <el-input v-model="exchangeRatio" :placeholder="1" />
            <span class="setting-creator-item-input-ratio-ticker">AR</span>
          </div>
        </div>
        <p class="setting-creator-item-desp">
          {{ $t('setting.exchangeRatioDescription') }}
        </p>
      </div>

      <!-- 解锁方案 -->
      <div class="setting-creator-item">
        <h4>
          {{ $t('setting.unlockPlan') + ` (${solutions.length}/${solutionMaximum})` }}
        </h4>
        <!-- 方案列表 -->
        <div class="setting-creator-item-plans">
          <div v-for="(item, index) of solutions" :key="index" class="plans-item">
            <!-- 方案预览模式 -->
            <div v-if="!item.editing" class="plans-item-show">
              <div class="plans-item-show-price">
                {{ $t('setting.ownBalance') }}
                <span class="plans-item-show-price-value">
                  {{ item.value }}
                </span>
                <span class="plans-item-show-price-suffix">
                  {{ ticker || 'PST' }}/{{ $t('setting.unlock') }}
                </span>
                <div class="plans-item-show-price-control">
                  <span class="mdi mdi-pencil" @click="item.editing = true" />
                  <span class="mdi mdi-close-thick" @click="removeSolution(index)" />
                </div>
              </div>
              <p class="plans-item-show-title">
                {{ item.title }}
              </p>
              <p class="plans-item-show-desp">
                {{ item.description }}
              </p>
            </div>
            <!-- 方案编辑模式 -->
            <div v-else class="plans-item-edit">
              <!-- 方案价格 -->
              <div class="plans-item-edit-price">
                {{ $t('setting.ownBalance') }}
                <el-input-number
                  class="plans-item-edit-price-input"
                  v-model="item.value"
                  controls-position="right"
                  size="small"
                  :precision="0"
                  :min="1"
                  :max="9007199254740991"
                />
                <span class="plans-item-edit-price-suffix">
                  {{ ticker || 'PST' }}/{{ $t('setting.unlock') }}
                </span>
                <div class="plans-item-edit-price-control">
                  <span class="mdi mdi-close-thick" @click="removeSolution(index)" />
                </div>
              </div>
              <!-- 方案名称 -->
              <div class="plans-item-edit-title">
                <el-input v-model="item.title" size="small" :placeholder="$t('setting.solutionName')" />
              </div>
              <!-- 方案介绍 -->
              <div class="plans-item-edit-desp">
                <el-input
                  v-model="item.description"
                  type="textarea"
                  size="small"
                  :autosize="{ minRows: 4, maxRows: 20 }"
                  :maxlength="400"
                  show-word-limit
                  :placeholder="$t('setting.solutionIntroduction')"
                />
              </div>
              <div class="plans-item-edit-btn">
                <el-button
                  type="primary"
                  size="medium"
                  :disabled="!!editCompletedCanClick(item)"
                  @click="editCompleted(item)"
                >
                  {{ $t('setting.endEdit') }}
                </el-button>
              </div>
            </div>
          </div>
          <div v-if="solutions.length < solutionMaximum" class="setting-creator-item-plans-add">
            <el-button @click="addSolution">
              {{ $t('setting.addSolution') }}
            </el-button>
          </div>
        </div>
      </div>
      <!-- 提交按钮 -->
      <div class="setting-creator-submit">
        <!-- 上一步 -->
        <el-button
          v-if="newAuthor"
          :disabled="initLoading || submitting"
          @click="previous"
        >
          {{ $t('setting.previous') }}
        </el-button>
        <!-- 保存 -->
        <el-button
          type="primary"
          :disabled="initLoading || submitting"
          @click="save"
        >
          {{ $t('setting.save') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import Bignumber from 'bignumber.js'

import { mapGetters, mapState, mapActions } from 'vuex'
import { getCookie } from '@/util/cookie'

import SettingNav from '@/components/SettingNav'

export default {
  name: 'Home',
  components: {
    SettingNav
  },
  data () {
    return {
      newAuthor: true,
      authorInfoLoading: true,
      name: '',
      ticker: '',
      tickerContract: 'gcF5fDyfAG8JCZI6kfdSS7cl3DEtgtbAyy9kI1GOVkA',
      ratio: '',
      solutionMaximum: 20,
      solutions: [
        {
          id: undefined,
          title: '',
          value: 1,
          description: '',
          editing: true
        }
      ],
      submitting: false
    }
  },
  computed: {
    ...mapGetters(['isLoggedIn']),
    ...mapState({
      myInfo: state => state.user.myInfo,
      myJwk: state => state.user.myJwk,
      creatorFormBackup: state => state.user.creatorFormBackup,
      tokenFormBackup: state => state.user.tokenFormBackup,
      creatorPst: state => state.contract.creatorPst
    }),
    initLoading () {
      return !this.isLoggedIn || this.authorInfoLoading
    },
    tickerInput: {
      /** 输入过滤 */
      set (val) {
        const regexp = new RegExp('[^a-zA-Z]', 'g')
        this.ticker = val.replace(regexp, '').toUpperCase()
      },
      get () {
        return this.ticker
      }
    },
    exchangeRatio: {
      /** 输入过滤 */
      set (val) {
        // 过滤 不是数字或小数点 或者 正常小数结构结束后的小数点和数字 或者 连续重复出现的小数点 的结果
        const regexp = new RegExp('([^0-9.])', 'g')
        this.ratio = val.replace(regexp, '')
      },
      get () {
        return this.ratio
      }
    },
    submitTips () {
      return this.submitting ? this.$t('setting.submittingPleaseDoNotCloseThePage') : ''
    }
  },
  watch: {
    isLoggedIn: {
      handler (val) {
        if (val) this.initFormData()
        else {
          // 对于没有登录的用户，检查 Cookie 中是否有 key，
          // 如果有的话，等待登录完成，没有则直接退回主页。
          const jwk = getCookie('arclight_userkey')
          if (!jwk) {
            this.$message.warning(this.$t('failure.noPermissionToAccessPage'))
            this.$router.push({ name: 'Home' })
          }
        }
      },
      immediate: true
    }
  },
  mounted () {
  },
  methods: {
    ...mapActions(['getCreatorInfo', 'setTokenFormBackup', 'getPstContract']),
    /** 初始化表单数据 */
    async initFormData () {
      const res = await this.getCreatorInfo(this.myInfo.address)
      // 这个地方应该正常获取数据
      if (!res) {
        this.newAuthor = true
        if (this.tokenFormBackup) {
          this.name = this.tokenFormBackup.name
          this.ticker = this.tokenFormBackup.ticker
          this.solutions = this.tokenFormBackup.items
          Bignumber.set({ EXPONENTIAL_AT: 16 })
          this.ratio = new Bignumber(this.tokenFormBackup.ratio).toString()
        }
        this.authorInfoLoading = false
        return
      }
      await this.getPstContract(res.ticker.contract)
      this.authorInfoLoading = false

      try {
        // 初始化兑换比率
        const halfRatio = String(parseFloat(String(this.creatorPst[res.ticker.contract].ratio).split(':')[1]))
        this.ratio = !halfRatio ? '' : halfRatio
        Bignumber.set({ EXPONENTIAL_AT: 26 })
        this.ratio = new Bignumber(this.ratio).toString()
      } catch (e) {
        this.ratio = '1'
      }

      this.name = res.ticker.name
      this.ticker = res.ticker.ticker
      this.tickerContract = res.ticker.contract
      if (res.items && res.items.length > 0) {
        this.solutions = res.items.map(item => {
          return {
            ...item,
            editing: false
          }
        })
      }
      this.newAuthor = false
    },
    /** 保存表单 */
    async save () {
      if (!this.isLoggedIn) return
      if (this.validationForm()) return
      // 新来的调用创建创作者方法，已经是创作者的调用编辑方法
      this.submitting = true
      if (this.newAuthor) {
        if (!this.creatorFormBackup) {
          this.$message.warning(this.$t('setting.pleaseReturnToThePreviousStepToFillInTheCreatorForm'))
          this.submitting = false
          return false
        }
        await this.createCreatorContract()
        this.createCreator()
      } else {
        await this.editToken()
      }
    },
    /** 编辑代币 */
    async editToken () {
      this.submitting = true
      const jwk = JSON.parse(this.myJwk)
      const info = await this.getCreatorInfo(this.myInfo.address)

      // 整理配对顺序
      info.items.sort((a, b) => a.id - b.id)
      let solutions = this.solutions.sort((a, b) => a.id - b.id)

      // 统一数据结构
      solutions = solutions.filter(item => !item.editing).map((e, i) => {
        return {
          id: i,
          value: String(e.value),
          title: String(e.title),
          description: String(e.description)
        }
      })

      if (JSON.stringify(solutions) !== JSON.stringify(info.items)) {
        await this.$api.contract.editCreatorItems(jwk, solutions)
      }
      const pstState = await this.$api.contract.readLikeyCreatorPstContract(info.ticker.contract)
      if ('1:' + this.ratio !== pstState.ratio) {
        await this.$api.contract.updateCreatorRatio(jwk, info.ticker.contract, '1:' + this.ratio)
      }
      this.$message.success(this.$t('success.success'))
      this.submitting = false
    },
    /** 创建代币 */
    async createCreatorContract () {
      const tickerObj = { ticker: this.ticker, name: this.name, ratio: '1:' + this.ratio }
      const jwk = JSON.parse(this.myJwk)
      const tx = await this.$api.contract.estimateCreatorPstContractFee(jwk, tickerObj)
      const address = await this.$api.gql.getAddress(jwk)
      let balance = this.$api.ArweaveNative.ar.arToWinston(await this.$api.arql.getBalance(address))
      balance = new Bignumber(balance)
      tx.fee = new Bignumber(tx.fee.data)
      if (balance.lt(tx.fee)) {
        this.$message.error(this.$t('failure.insufficientFunds'))
        return
      }
      this.tickerContract = await this.$api.contract.createCreatorPstContract(jwk, tickerObj)
    },
    /** 创建创作者 */
    async createCreator () {
      if (!this.creatorFormBackup) {
        this.$message.warning(this.$t('setting.pleaseReturnToThePreviousStepToFillInTheCreatorForm'))
        this.submitting = false
        return false
      }
      const jwk = JSON.parse(this.myJwk)
      // 上传表单。依次为：创作者表单，代币名称和简写，解锁方案列表
      try {
        const res = await this.$api.contract.announceCreator(jwk, {
          ...this.creatorFormBackup
        }, {
          name: this.name,
          ticker: this.ticker,
          contract: this.tickerContract,
          ratio: '1:' + this.ratio
        }, this.solutions.filter(item => !item.editing).map(item => {
          return {
            title: item.title,
            value: String(item.value),
            description: item.description
          }
        }))
        this.submitting = false
        if (res.type !== 'ok') {
          this.$message.warning(this.$t('failure.saveFailed'))
        } else {
          this.$alert(this.$t('setting.createSuccessfulAlertContent'), this.$t('success.created'), {
            confirmButtonText: this.$t('setting.ok'),
            callback: () => {
              this.$router.push({ name: 'User', params: { id: this.myInfo.address } })
            }
          })
        }
      } catch (err) {
        this.submitting = false
        this.$message.warning(this.$t('failure.saveFailed'))
      }
    },
    /** 表单校验 */
    validationForm () {
      if (!this.name) {
        this.$message.warning(this.$t('setting.nameShouldNotBeEmpty'))
        return 1
      }
      if (!this.name.length >= 100) {
        this.$message.warning(this.$t('setting.theLengthOfThisNameIsTooLong'))
        return 2
      }
      if (!this.ticker) {
        this.$message.warning(this.$t('setting.tickerShouldNotBeEmpty'))
        return 3
      }
      if (!this.ticker.length >= 20) {
        this.$message.warning(this.$t('setting.tickerShouldNotBeEmpty'))
        return 4
      }
      if (this.solutions.find(item => item.editing && !this.isCmptySolution(item))) {
        this.$message.warning(this.$t('setting.solutionEditingHasNotCompletedYet'))
        return 5
      }
      const ratioRegexp = new RegExp('^[0-9]+(\\.[0-9]{0,11})?$', 'g')
      if (!ratioRegexp.test(this.ratio)) {
        this.$message.warning(this.$t('setting.exchangeRatioIsNotAValidNumber'))
        return 6
      }
      Bignumber.set({ EXPONENTIAL_AT: 16 })
      const ratio = new Bignumber(this.ratio)
      if (!this.ratio ||
          ratio.toString() === 'NaN' ||
          ratio.isLessThanOrEqualTo(new Bignumber(0))) {
        this.$message.warning(this.$t('setting.pleaseFillInTheExchangeRatio'))
        return 8
      }
      const decimals = ratio.toString().split('.')[1]
      if (decimals && decimals.length > String(100000000000).length) {
        this.$message.warning(this.$t('setting.exchangeRatioExceedsTheLimitation'))
        return 7
      }
      return 0
    },
    /** 添加一个解锁方案 */
    addSolution () {
      if (this.solutions.length >= this.solutionMaximum) return
      this.solutions.push({
        id: undefined,
        title: '',
        value: 0,
        description: '',
        editing: true
      })
    },
    /** 移除一个解锁方案 */
    removeSolution (index) {
      if (this.isCmptySolution(this.solutions[index] || {})) {
        this.solutions.splice(index, 1)
        return
      }

      this.$confirm(this.$t('setting.areYouSureYouWantToDelete'), this.$t('setting.warning'), {
        confirmButtonText: this.$t('setting.ok'),
        cancelButtonText: this.$t('setting.cancel'),
        type: 'warning'
      }).then(() => {
        this.solutions.splice(index, 1)
      })
    },
    /** 解锁方案子表单校验 */
    editCompletedCanClick (item) {
      // 没有标题
      if (!item.title.trim()) {
        return 1
      }
      // 标题太长
      if (item.title.trim().length > 100) {
        return 2
      }
      // PST 数量不合法
      if (item.value <= 0 || isNaN(item.value)) {
        return 3
      }
      // 没有介绍
      if (!item.description.trim()) {
        return 4
      }
      // 介绍太长
      if (!item.description.trim().length > 400) {
        return 5
      }
      return 0
    },
    /** 编辑完成 */
    editCompleted (item) {
      if (this.editCompletedCanClick(item)) return
      item.editing = false
    },
    /** 是空的解锁方案表单 */
    isCmptySolution (item) {
      return !(item.id || item.title.trim() || item.value !== 1 || item.description.trim())
    },
    /** 返回上一步 */
    previous () {
      this.setTokenFormBackup({
        name: this.name,
        ticker: this.ticker,
        items: this.solutions,
        ratio: this.ratio
      })
      this.$router.push({ name: 'Setting-Creator' })
    },
    /** 复制合约地址 */
    copyContractAddress (address) {
      this.$copyText(address).then(
        () => {
          this.$message({
            showClose: true,
            message: this.$t('success.copy'),
            type: 'success'
          })
        },
        () => {
          this.$message({ showClose: true, message: this.$t('error.copy'), type: 'error' })
        }
      )
    }
  }
}
</script>

<style lang="less" scoped>
.setting {
  margin: 20px auto 60px;
  width: 100%;
  max-width: 820px;
  box-sizing: border-box;
  padding: 0 10px;

  &-header {
    h3 {
      color: @dark;
      margin: 0 0 20px;
      font-size: 18px;
    }
  }

  &-creator {
    background: @background;
    box-shadow: 0 0 2px 0 #0000001a;
    box-sizing: border-box;
    padding: 20px;
    border-radius: 6px;
    overflow: hidden;

    &-item {
      margin: 0 0 40px;

      &-contract {
        display: flex;
        align-items: center;
        margin-top: 10px;

        &-address {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
          word-break: break-all;
        }

        .copy-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: @primary;

          &:hover {
            color: @secondary;
          }

          &:active {
            color: @primary-dark;
          }
        }
      }

      h4 {
        color: @dark;
        padding: 0;
        margin: 0 0 5px;
        font-size: 16px;
      }

      &-input {
        margin: 0 0 5px;
        font-size: 15px;
        display: flex;
        align-items: center;
        color: @dark;

        /deep/ .el-select {
          display: block;
          flex: 1;
        }
        span {
          font-weight: 700;
          font-size: 20px;
        }

        &-pst-ratio {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
          word-break: break-all;
          white-space: normal;
        }

        &-ratio {
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 250px;
          min-width: 250px;
          margin-left: 5px;

          &-ticker {
            margin-left: 5px;
          }
        }
      }

      &-desp {
        color: @gray3;
        padding: 0;
        margin: 0;
        font-size: 14px;
        font-weight: 400;
      }

      a {
        color: @primary;
        cursor: pointer;
        text-decoration: none;
        font-weight: 500;
      }

      &-plans {
        margin: 0 0 0;

        &-add {
          button {
            display: block;
            width: 100%;
            border-color: @gray2;
          }
        }
      }
    }

    &-submit {
      display: flex;
      justify-content: center;
      margin: 0 0 20px;
      button {
        min-width: 130px;
        margin-right: 20px;
        &:last-child {
          margin-right: 0;
        }
      }
    }
  }

  .plans-item {
    border: 1px solid @gray2;
    box-sizing: border-box;
    overflow: hidden;
    border-radius: 6px;
    padding: 10px;
    margin: 0 0 10px;
    &-show {
      &-price {
        font-size: 24px;
        font-weight: 500;
        color: @gray3;
        padding: 0;
        margin: 0 0 5px;
        display: flex;
        align-items: flex-start;
        white-space:nowrap;
        &-value {
          color: @primary;
          padding: 0;
          margin: 0 5px 0 5px;
          white-space: normal;
          word-break: break-all;
        }
        &-suffix {
          color: @gray3;
          font-size: 14px;
          line-height: 29px;
          padding: 0;
          margin: 0;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
          word-break: break-all;
          white-space: normal;
          align-self: flex-end;
          flex: 1;
        }

        &-control {
          display: flex;
          justify-content: flex-end;
          span {
            font-size: 24px;
            color: @gray3;
            display: inline-flex;
            width: 34px;
            height: 34px;
            min-width: 34px;
            min-height: 34px;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            overflow: hidden;
            border-radius: 6px;
            background: @background;
            margin-right: 5px;
            &:last-child {
              margin-right: 0;
            }
            &:hover {
              color: @primary;
              background: @gray1;
            }
          }
        }
      }

      &-title {
        font-size: 15px;
        padding: 0;
        margin: 0 0 5px;
        font-weight: 500;
      }

      &-desp {
        font-size: 14px;
        padding: 0;
        margin: 0;
      }
    }

    &-edit {

      &-price {
        font-size: 24px;
        font-weight: 500;
        color: @gray3;
        padding: 0;
        margin: 0 0 5px;
        display: flex;
        align-items: flex-start;
        white-space:nowrap;
        &-input {
          margin: 0 5px 0 5px;
        }
        &-suffix {
          color: @gray3;
          font-size: 14px;
          line-height: 29px;
          padding: 0;
          margin: 0;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
          word-break: break-all;
          white-space: normal;
          align-self: flex-end;
          flex: 1;
        }

        &-control {
          display: flex;
          justify-content: flex-end;
          span {
            font-size: 24px;
            color: @gray3;
            display: inline-flex;
            width: 34px;
            height: 34px;
            min-width: 34px;
            min-height: 34px;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            overflow: hidden;
            border-radius: 6px;
            background: @background;
            margin-right: 5px;
            &:last-child {
              margin-right: 0;
            }

            &:hover {
              color: @primary;
              background: @gray1;
            }
          }
        }
      }

      &-title {
        margin: 0 0 5px;
      }

      &-desp {
        margin: 0 0 10px;
      }

      &-btn {
        margin: 0;
      }
    }
  }
}
</style>
