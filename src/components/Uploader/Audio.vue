<template>
  <div :class="{ disabled }" class="audio-input" id="audio-input">
    <label
      for="audio-input-area"
    >
      <span class="mdi mdi-music-note-eighth mdicon" />
    </label>
    <input
      class="audio-input-area"
      id="audio-input-area"
      type="file"
      accept="audio/mp3,audio/flac,audio/wave,audio/wav,audio/ogg,audio/mpeg"
      :multiple="multiple"
      :disabled="disabled"
    >
  </div>
</template>

<script>
export default {
  props: {
    multiple: {
      type: Boolean,
      default: false
    },
    /** 禁用 */
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      fileBuffer: []
    }
  },
  mounted () {
    /** 初始化文件输入监听器 */
    this.initFileInputEventListener()
  },
  methods: {
    initFileInputEventListener () {
      const fileInput = document.getElementById('audio-input-area')
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 20) {
          return
        }

        fileInput.files.forEach(e => {
          const reader = new FileReader()
          reader.readAsArrayBuffer(e)
          reader.onload = (res) => {
            try {
              // 创建音频 blob
              const audioBuffer = new Uint8Array(res.target.result)
              const blob = new Blob([audioBuffer], { type: e.type })
              const url = window.URL || window.webkitURL
              const audioSrc = url.createObjectURL(blob)
              // // 创建空元素
              const audioElement = document.createElement('audio')
              audioElement.oncanplaythrough = () => {
                this.fileBuffer.push({ data: res.target.result, name: e.name, type: e.type, size: e.size, duration: parseInt(audioElement.duration * 1000), objectUrl: audioSrc })
                if (fileInput.files.length === this.fileBuffer.length) {
                  this.done()
                  fileInput.value = null
                }
                document.getElementById('audio-duration-element').remove()
              }

              audioElement.src = audioSrc
              audioElement.id = 'audio-duration-element'
              audioElement.style.cssText = 'display: none;'

              fileInput.appendChild(audioElement)
            } catch (err) {
              this.fileBuffer.push({ data: null, name: '', type: '', size: 0, error: true })
            }
            if (fileInput.files.length === this.fileBuffer.length) {
              this.done()
              fileInput.value = null
            }
          }
        })
      })
    },
    done () {
      if (this.fileBuffer.find(item => item.error)) this.$message.error(this.$t('failure.unableToGetFile'))
      this.$emit('audio-input', this.fileBuffer.filter(item => !item.error))
      this.fileBuffer = []
    }
  }
}
</script>

<style lang="less" scoped>
.audio-input {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;

  label {
    width: 100%;
    text-align: center;
  }

  .mdicon {
    display: block;
    margin-top: 2px;
    font-size: 22px;
    color: @gray3;
    cursor: pointer;
  }

  &:hover {
    background-color: @primary-light;
    .mdicon {
      color: @primary;
    }
  }

  &:active {
    background-color: @primary-dark;
    .mdicon {
      color: @primary;
    }
  }

  &.disabled {
    background-color: #00000000;
    cursor: not-allowed;

    .mdicon {
      color: @gray2;
      cursor: not-allowed;
    }
  }

  &-area {
    display: none;
  }
}
</style>
