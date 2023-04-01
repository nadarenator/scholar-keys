const splitText = all_text.split(' ')
let testLength = 25
let maxSplitPoint = splitText.length - testLength

// const rstlne = 'qagwsxdecfrvzl?;hbunjkimyo,pt. '
// const twof = 'jxmwsdrnlctbzgvqhyuafie,op.k;? '
// const onef = 'vgfcdnlatreoismhupwy.b,xkzjq;? '
const keyboardConfigs = {
  heuristicOptimized: {
    layout: 'ueygoqmtblnwkrjzhxdsvpi,fa.c;? ',
    position: 'ugmlkzdpfceotnrhsiayqbwjxv',
    name: 'Heuristic Optimized',
  },
  countOptimized: {
    layout: 'ceyhtbdiwmavqrjzlxuokpn,fs.g;? ',
    position: 'chdmqzupfgetiarlonsybwvjxk',
    name: 'Count Optimized',
  },
  qwerty: {
    layout: 'qazwsxedcrfvtgbyhnujmik,ol.p;? ',
    position: 'qwertyuiopasdfghjklzxcvbnm',
    name: 'QWERTY',
  },
}

function createStatisticsUi(configName) {
  const ele = document.createElement('div')
  ele.classList.add('statistic', 'center')
  const child = document.createElement('div')
  child.classList.add('value')
  child.id = `${configName}`
  child.innerText = '0.00'
  ele.appendChild(child)
  const labelChild = document.createElement('div')
  labelChild.classList.add('label')
  labelChild.innerText = keyboardConfigs[configName].name
  ele.appendChild(labelChild)
  return ele
}

let curIndex = 0
let curLayout = keyboardConfigs.qwerty.layout
let curLayoutKey = 'qwerty'
let testText = 'hello world'
let typedText = 'hello wors'
let ready = true
let startTime = 0
let endTime

$(document).ready(() => {
  resetText()

  // create statistics ui for each key in keyboardConfigs
  Object.keys(keyboardConfigs).forEach((configName) => {
    console.log(configName)
    const ele = createStatisticsUi(configName)
    $('#statistics-info').append(ele)
  })

  $('#layout-selector').dropdown({
    values: [
      ...Object.keys(keyboardConfigs).map((configName) => {
        return {
          name: keyboardConfigs[configName].name,
          value: configName,
          selected: configName === curLayoutKey,
        }
      }),
    ],
    onChange: function (value, text, $selectedItem) {
      //   if (value === 'kev1') {
      //     setLayout(kev1)
      //   } else if (value === 'kev2') {
      //     setLayout(kev2)
      //   }
      if (typeof keyboardConfigs[value] !== 'undefined') {
        setLayout(keyboardConfigs[value].layout, value)
      }
    },
  })
  setLayout(curLayout, curLayoutKey)

  $('#restart-icon').popup()
  $('#restart-icon').click(resetText)

  $('#10words').click(function () {
    testLength = 10
    maxSplitPoint = splitText.length - testLength
    $('#10words').addClass('active-option')
    $('#25words').removeClass('active-option')
    $('#40words').removeClass('active-option')
    resetText()
  })

  $('#25words').click(function () {
    testLength = 25
    maxSplitPoint = splitText.length - testLength
    $('#25words').addClass('active-option')
    $('#10words').removeClass('active-option')
    $('#40words').removeClass('active-option')
    resetText()
  })

  $('#40words').click(function () {
    testLength = 40
    maxSplitPoint = splitText.length - testLength
    $('#40words').addClass('active-option')
    $('#10words').removeClass('active-option')
    $('#25words').removeClass('active-option')
    resetText()
  })

  for (let i = 0; i <= 31; i++) {
    $(`#key-${i}`).click(function () {
      let index = parseInt(this.id.split('-')[1])
      if (index == 31) {
        if (typedText.length > 0) {
          typedText = typedText.substring(0, typedText.length - 1)
        }
      } else if (index == 30) {
        if (typedText.length > 0) {
          typedText += curLayout[index]
        }
      } else {
        if (startTime == 0) {
          startTime = Date.now()
        }
        typedText += curLayout[index]
      }
      let formatText = evaluateText()
      updateText(formatText)
    })
  }
})

$(document).keydown((event) => {
  if (
    !ready ||
    !keyMapping[event.which] ||
    keyMapping[event.which].pressed == true
  )
    return
  keyMapping[event.which].pressed = true
  $(`#key-${keyMapping[event.which].index}`).addClass('active')
  if (event.which == 8) {
    if (typedText.length > 0) {
      typedText = typedText.substring(0, typedText.length - 1)
    }
  } else if (event.which == 32) {
    event.preventDefault()
    if (typedText.length > 0) {
      typedText += curLayout[keyMapping[event.which].index]
    }
  } else {
    if (startTime == 0) {
      startTime = Date.now()
    }
    typedText += curLayout[keyMapping[event.which].index]
  }
  let formatText = evaluateText()
  updateText(formatText)
})

$(document).keyup((event) => {
  if (!keyMapping[event.which]) return
  keyMapping[event.which].pressed = false
  $(`#key-${keyMapping[event.which].index}`).removeClass('active')
})

function resetText() {
  const splitPoint = Math.floor(Math.random() * maxSplitPoint)
  testText = splitText.slice(splitPoint, splitPoint + testLength).join(' ')
  typedText = ''
  curIndex = 0
  ready = true
  startTime = 0
  endTime = 0
  $('#acc').text('--')
  $('#wpm').text('--')
  // let textContent = `<span class="underline untyped-text">${testText[0]}</span><span class="untyped-text">${testText.substring(1)}</span>`
  // $('#text-content').html(textContent)
  let formatText = evaluateText()
  updateText(formatText)
}

function setLayout(layout, key) {
  curLayout = layout
  curLayoutKey = key
  for (let i = 0; i < 30; i++) {
    $(`#key-${i}`).text(layout[i].toUpperCase())
  }
}

function evaluateText() {
  let formatText = []
  let testWords = testText.split(' ')
  let typedWords = typedText.split(/\s+/)
  let curState = 'typed'
  let curString = ''
  for (let i = 0; i < testWords.length; i++) {
    // curString += ' '
    let curWord = testWords[i]
    if (typedWords[i] == undefined) {
      if (curState !== 'untyped') {
        formatText.push({ state: curState, text: curString })
        curString = ''
        curState = 'untyped'
      }
      curString += ' ' + curWord
      continue
    }
    curString += ' '
    let j
    for (j = 0; j < curWord.length; j++) {
      if (!typedWords[i][j] && typedWords[i + 1] != undefined) {
        if (curState !== 'missed') {
          formatText.push({ state: curState, text: curString })
          curString = ''
          curState = 'missed'
        }
        curString += curWord[j]
      } else if (!typedWords[i][j]) {
        if (curState !== 'untyped') {
          formatText.push({ state: curState, text: curString })
          curString = ''
          curState = 'untyped'
        }
        curString += curWord[j]
      } else if (curWord[j] == typedWords[i][j]) {
        if (curState !== 'typed') {
          formatText.push({ state: curState, text: curString })
          curString = ''
          curState = 'typed'
        }
        curString += curWord[j]
      } else if (curWord[j] != typedWords[i][j]) {
        if (curState !== 'wrong') {
          formatText.push({ state: curState, text: curString })
          curString = ''
          curState = 'wrong'
        }
        curString += curWord[j]
      }
    }

    if (typedWords[i].length > curWord.length) {
      for (; j < typedWords[i].length; j++) {
        if (curState !== 'extra') {
          formatText.push({ state: curState, text: curString })
          curString = ''
          curState = 'extra'
        }
        curString += typedWords[i][j]
      }
    }
  }
  formatText.push({ state: curState, text: curString })

  if (
    (testWords.length == typedWords.length &&
      testWords[testWords.length - 1].length ==
        typedWords[typedWords.length - 1].length) ||
    typedWords.length > testWords.length
  ) {
    ready = false
    endTime = Date.now()
    getStatistics()
  }
  return formatText
}

function updateText(formatText) {
  let contentHtml = ''
  for (let i = 0; i < formatText.length; i++) {
    if (formatText[i].state === 'typed') {
      contentHtml += `<span class="typed-text">${formatText[i].text}</span>`
    } else if (formatText[i].state === 'missed') {
      contentHtml += `<span class="untyped-text">${formatText[i].text}</span>`
    } else if (formatText[i].state === 'untyped') {
      let cursorPos = 0
      if (
        typedText[typedText.length - 1] == ' ' &&
        formatText[i].text[0] == ' '
      ) {
        contentHtml += `<span class="typed-text">${formatText[i].text[cursorPos]}</span>`
        cursorPos++
      }
      contentHtml += `<span class="untyped-text underline">${formatText[i].text[cursorPos]}</span>`
      cursorPos++
      if (formatText[i].text.length > cursorPos) {
        contentHtml += `<span class="untyped-text">${formatText[
          i
        ].text.substring(cursorPos)}</span>`
      }
    } else if (formatText[i].state === 'wrong') {
      contentHtml += `<span class="wrong-text">${formatText[i].text}</span>`
    } else if (formatText[i].state === 'extra') {
      contentHtml += `<span class="extra-text">${formatText[i].text}</span>`
    }
  }
  $('#text-content').html(contentHtml)
  getStatistics()
}

function getStatistics() {
  const fingers = [
    'l4',
    'l3',
    'l2',
    'l1',
    'l1',
    'r1',
    'r1',
    'r2',
    'r3',
    'r4',
    'l4',
    'l3',
    'l2',
    'l1',
    'l1',
    'r1',
    'r1',
    'r2',
    'r3',
    'l4',
    'l3',
    'l2',
    'l1',
    'l1',
    'r1',
    'r1',
  ]
  const totalTime = (endTime - startTime) / 1000
  const dtArr = [
    1.03, 1.03, 1.03, 1.03, 1.25, 1.6, 1.03, 1.03, 1.03, 1.03, 0.0, 0.0, 0.0,
    0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.12, 1.12, 1.12, 1.12, 1.8, 1.12, 1.12,
  ]

  // const distanceTravelled = Array.from(typedText).reduce((acc, cur) => {
  //   if (
  //     cur === ' ' ||
  //     cur === ',' ||
  //     cur === '.' ||
  //     cur === ';' ||
  //     cur === ';'
  //   ) {
  //     return acc
  //   } else {
  //     return acc + dtArr[keyboardConfigs[curLayoutKey].position.indexOf(cur)]
  //   }
  // }, 0)

  // $('#wpm').text(distanceTravelled.toFixed(2))
  Object.keys(keyboardConfigs).forEach((key) => {
    const distanceTravelled = Array.from(typedText).reduce(
      (acc, cur, index) => {
        let value = 0
        if (
          cur === ' ' ||
          cur === ',' ||
          cur === '.' ||
          cur === ';' ||
          cur === ';'
        ) {
          value = acc
        } else {
          value = acc + dtArr[keyboardConfigs[key].position.indexOf(cur)]
        }

        if (index !== 0) {
          const currFinger = fingers[keyboardConfigs[key].position.indexOf(cur)]
          const prevFinger =
            fingers[keyboardConfigs[key].position.indexOf(typedText[index - 1])]
          if (currFinger === prevFinger) {
            value += 0.2
          }
        }

        return value
      },
      0
    )
    $(`#${key}`).text(distanceTravelled.toFixed(2))
  })
}
DarkReader.setFetchMethod(window.fetch)
DarkReader.enable({
  brightness: 100,
  contrast: 90,
  sepia: 0,
})
