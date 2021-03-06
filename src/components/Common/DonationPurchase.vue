<template>
  <div>
    <el-dialog
      :title="$t('donation.donateToCreator')"
      :visible.sync="dialogVisible"
      :before-close="handleClose"
      width="380px"
      custom-class="donation-dialog"
    >
      <div class="donation-wrapper">
        <div class="donation-container">
          <div class="donation-container-balacne">
            <span class="donation-container-balacne">{{ $t('payment.currentBalance') }}:</span>
            <span class="donation-container-ar"> {{ balance | winstonToAr | finalize(loading) }}</span>
          </div>
          <div class="donation-container-input">
            <el-input
              v-model="arInput"
              class="donation-container-input-input"
              :placeholder="$t('donation.pleaseInputDonationAmount')"
            >
              <template slot="append">
                AR
              </template>
            </el-input>
          </div>
          <el-button
            class="donation-confirm-button"
            type="primary"
            block
            :precision="0"
            :min="1"
            :disabled="loading"
            :max="9007199254740991"
            @click="step2"
          >
            {{ $t('payment.checkout') }}
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import BigNumber from 'bignumber.js'
import { mapGetters, mapState } from 'vuex'
export default {
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  data () {
    return {
      dialogVisible: this.value,
      input: '',
      loading: false,
      balance: '0'
    }
  },
  computed: {
    ...mapState({
      myAddress: state => state.user.myInfo.address
    }),
    ...mapGetters(['isLoggedIn']),
    arInput: {
      /** 输入过滤 */
      set (val) {
        // 过滤 不是数字或小数点 或者 正常小数结构结束后的小数点和数字 或者 连续重复出现的小数点 的结果
        const regexp = new RegExp('([^0-9.])', 'g')
        this.input = val.replace(regexp, '')
      },
      get () {
        return this.input
      }
    }
  },
  watch: {
    value (val) {
      this.dialogVisible = val
      if (val) {
        this.getUserBalance(this.myAddress)
      }
    }
  },
  methods: {
    async getUserBalance (address) {
      if (!this.isLoggedIn) {
        this.$message.error(this.$t('login.pleaseLogInFirst'))
        return
      }
      this.loading = true
      this.balance = await this.$api.ArweaveNative.wallets.getBalance(address)
      this.loading = false
    },
    step2 () {
      if (!this.isLoggedIn) {
        this.$message.error(this.$t('login.pleaseLogInFirst'))
        return
      }
      BigNumber.set({ EXPONENTIAL_AT: 16 })
      if (!this.input ||
          this.input === '0' ||
          new BigNumber(this.input).toString() === 'NaN' ||
          new BigNumber(this.input).isLessThanOrEqualTo(new BigNumber(0))
      ) {
        this.$message.error(this.$t('donation.donationAmountShouldnotBeNone'))
        return
      }
      const regexp = new RegExp('^[0-9]+(\\.[0-9]{0,11})?$')
      if (!regexp.test(this.input)) {
        this.$message.error(this.$t('donation.pleaseInputValidDonationAmount'))
        return
      }
      this.$emit('confirm-donation', String(this.input))
    },
    handleClose (done) {
      this.dialogVisible = false
      this.input = ''
      this.$emit('donation-close', false)
      done()
    }
  }
}
</script>

<style lang="less" scoped>
.donation-wrapper {
  .donation-container {
    display: flex;
    flex-direction: column;

    &-balacne {
      margin-bottom: 10px;
    }

    &-input {
      display: flex;
      align-items: center;

      &-input {
        width: 100%;
      }
      &-ticker {
        white-space: nowrap;
        font-size: 20px;
        font-weight: 500;
        margin-left: 10px;
      }
    }

    .donation-confirm-button {
      margin-top: 20px
    }
  }
}

/deep/ .donation-dialog {
  border-radius: 6px;
}

@media screen and (max-width: 420px) {
  /deep/ .donation-dialog {
    width: 90% !important;
  }
}

</style>
