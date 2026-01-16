;(() => {
  // ============================================
  // LUCIFER AUTO BETTING BOT - Pure JavaScript
  // With Auto-Clicker for TashanWin
  // ============================================

  // Configuration
  var CONFIG = {
    RESULTS_API: "https://api.tkshostify.in/api/1m/latest",
    TELEGRAM_BOT_API: "8231100734:AAFmbMJ3tvRDNzKoyK5IrQbXZ4NzNhcS2Ow",
    TELEGRAM_GROUP_IDS: ["-1002411882816", "-1003182588648"],
    FETCH_INTERVAL: 2000,
    MAX_HISTORY: 200,
    CLICK_DELAY: 150, // Reduced delay for faster clicking
    PLUS_CLICK_DELAY: 50, // Delay between each + click
  }

  // State
  var state = {
    history: [],
    lastProcessedIssue: "",
    last10Results: [],
    isRunning: false,
  }

  // ============================================
  // AUTO-CLICKER BUTTON SELECTORS
  // TashanWin specific selectors - won't affect other sites
  // ============================================

  var BUTTON_SELECTORS = {
    // Button 1 - Big button on main game screen
    BIG_BUTTON: [
      ".Betting__C-foot-s .Betting__C-foot-s-item:first-child", // TashanWin Big
      ".GameList__C-body .Bcontent__C:first-child",
      'div[class*="Betting"][class*="Big"]',
      ".bet-big-btn",
      '[data-type="big"]',
    ],
    // Button 2 - Small button on main game screen
    SMALL_BUTTON: [
      ".Betting__C-foot-s .Betting__C-foot-s-item:last-child", // TashanWin Small
      ".GameList__C-body .Bcontent__C:last-child",
      'div[class*="Betting"][class*="Small"]',
      ".bet-small-btn",
      '[data-type="small"]',
    ],
    // Button 3 & 5 - Plus button inside popup (increment amount by 1)
    PLUS_BUTTON: [
      ".Recharge__C-foot-num .Recharge__C-foot-btn:last-child", // TashanWin + button
      ".van-stepper__plus",
      ".quantity-control .plus",
      '[class*="stepper"] [class*="plus"]',
      ".amount-plus",
    ],
    // Button 4 & 6 - Confirm/Total amount button at bottom of popup
    CONFIRM_BUTTON: [
      ".Recharge__C-btn:not(.canbtn)", // TashanWin Total amount button (active)
      ".Recharge__C-btn.Recharge__C-btn-act",
      'div[class*="Recharge"][class*="btn"]:last-child',
      ".confirm-bet-btn",
      ".place-bet-btn",
    ],
    // Cancel button (to close popup if needed)
    CANCEL_BUTTON: [".Recharge__C-btn.canbtn", ".cancel-btn", 'button:contains("Cancel")'],
  }

  // Track click state to prevent double-triggering
  var clickState = {
    isExecuting: false,
    lastClickTime: 0,
    clickLog: [],
  }

  // ============================================
  // AUTO-CLICKER CORE FUNCTIONS
  // ============================================

  function findElement(selectors, context) {
    context = context || document
    for (var i = 0; i < selectors.length; i++) {
      var selector = selectors[i]
      try {
        // Handle :contains pseudo-selector manually
        if (selector.indexOf(":contains(") !== -1) {
          var match = selector.match(/:contains$$"(.+)"$$/)
          if (match) {
            var tag = selector.split(":contains")[0] || "*"
            var text = match[1]
            var elements = context.querySelectorAll(tag)
            for (var j = 0; j < elements.length; j++) {
              if (elements[j].textContent.trim().toLowerCase().indexOf(text.toLowerCase()) !== -1) {
                return elements[j]
              }
            }
          }
        } else {
          var el = context.querySelector(selector)
          if (el && isElementVisible(el)) return el
        }
      } catch (e) {
        // Invalid selector, try next
      }
    }
    return null
  }

  function isElementVisible(el) {
    if (!el) return false
    var rect = el.getBoundingClientRect()
    var style = window.getComputedStyle(el)
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    )
  }

  function simulateClick(element, logName) {
    if (!element) {
      logClick(logName || "unknown", false, "Element not found")
      return false
    }

    if (!isElementVisible(element)) {
      logClick(logName || "unknown", false, "Element not visible")
      return false
    }

    try {
      var rect = element.getBoundingClientRect()
      var centerX = rect.left + rect.width / 2
      var centerY = rect.top + rect.height / 2

      // Method 1: Touch events (for mobile)
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        var touch = new Touch({
          identifier: Date.now(),
          target: element,
          clientX: centerX,
          clientY: centerY,
          radiusX: 2.5,
          radiusY: 2.5,
          rotationAngle: 10,
          force: 0.5,
        })

        var touchStartEvent = new TouchEvent("touchstart", {
          cancelable: true,
          bubbles: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        })

        var touchEndEvent = new TouchEvent("touchend", {
          cancelable: true,
          bubbles: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch],
        })

        element.dispatchEvent(touchStartEvent)
        element.dispatchEvent(touchEndEvent)
      }

      // Method 2: Mouse events
      var mouseEvents = ["mousedown", "mouseup", "click"]
      for (var i = 0; i < mouseEvents.length; i++) {
        var evt = new MouseEvent(mouseEvents[i], {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0,
        })
        element.dispatchEvent(evt)
      }

      // Method 3: Direct click as fallback
      if (typeof element.click === "function") {
        element.click()
      }

      logClick(logName || element.className || element.tagName, true, "OK")
      return true
    } catch (e) {
      logClick(logName || "unknown", false, e.message)
      return false
    }
  }

  function logClick(buttonName, success, message) {
    var logEntry = {
      time: new Date().toLocaleTimeString(),
      button: buttonName,
      success: success,
      message: message,
    }
    clickState.clickLog.push(logEntry)
    if (clickState.clickLog.length > 50) {
      clickState.clickLog.shift()
    }
    console.log(
      "[AUTO-CLICK] " + logEntry.time + " | " + buttonName + " | " + (success ? "SUCCESS" : "FAILED") + " | " + message,
    )
  }

  // ============================================
  // BUTTON CLICK FUNCTIONS
  // ============================================

  // Button 1 - Click Big button
  function clickBigButton() {
    var btn = findElement(BUTTON_SELECTORS.BIG_BUTTON)
    return simulateClick(btn, "BIG_BUTTON")
  }

  // Button 2 - Click Small button
  function clickSmallButton() {
    var btn = findElement(BUTTON_SELECTORS.SMALL_BUTTON)
    return simulateClick(btn, "SMALL_BUTTON")
  }

  function clickPlusButtonMultiple(times, callback) {
    times = times || 1
    var clicked = 0
    var btn = findElement(BUTTON_SELECTORS.PLUS_BUTTON)

    if (!btn) {
      logClick("PLUS_BUTTON", false, "Button not found")
      if (callback) callback(false)
      return
    }

    console.log("[AUTO-CLICK] Clicking + button " + times + " times...")

    function clickNext() {
      if (clicked >= times) {
        console.log("[AUTO-CLICK] Completed " + clicked + " plus clicks")
        if (callback) callback(true)
        return
      }

      // Re-find button each time (in case DOM updates)
      var plusBtn = findElement(BUTTON_SELECTORS.PLUS_BUTTON)
      if (plusBtn) {
        simulateClick(plusBtn, "PLUS_BUTTON_" + (clicked + 1))
        clicked++
      }

      setTimeout(clickNext, CONFIG.PLUS_CLICK_DELAY)
    }

    clickNext()
  }

  // Button 4 & 6 - Click Confirm/Total Amount button
  function clickConfirmButton() {
    var btn = findElement(BUTTON_SELECTORS.CONFIRM_BUTTON)
    return simulateClick(btn, "CONFIRM_BUTTON")
  }

  // ============================================
  // MASTER AUTO-BET EXECUTION
  // ============================================

  function executeBet(prediction, betAmount) {
    if (!BETTING_CONFIG.AUTO_CLICKER_ENABLED) {
      console.log("[AUTO-CLICK] Auto-clicker disabled")
      return Promise.resolve(false)
    }

    if (clickState.isExecuting) {
      console.log("[AUTO-CLICK] Already executing, skipping...")
      return Promise.resolve(false)
    }

    // Prevent rapid clicks (minimum 2 second gap)
    var now = Date.now()
    if (now - clickState.lastClickTime < 2000) {
      console.log("[AUTO-CLICK] Too fast, waiting...")
      return Promise.resolve(false)
    }

    clickState.isExecuting = true
    clickState.lastClickTime = now

    console.log("========================================")
    console.log("[AUTO-CLICK] EXECUTING BET")
    console.log("[AUTO-CLICK] Prediction: " + prediction)
    console.log("[AUTO-CLICK] Amount: " + betAmount + " rupees")
    console.log("========================================")

    // Calculate plus clicks: betAmount - 1 (since default is 1 rupee)
    var plusClicks = Math.max(0, betAmount - 1)

    return new Promise((resolve) => {
      if (prediction === "BIG") {
        // BIG: Trigger buttons 1 -> 3 -> 4
        console.log("[AUTO-CLICK] BIG: Clicking Big -> Plus x" + plusClicks + " -> Confirm")

        // Step 1: Click Big button
        clickBigButton()

        // Step 2: Wait for popup, then click plus
        setTimeout(() => {
          clickPlusButtonMultiple(plusClicks, () => {
            // Step 3: Click confirm
            setTimeout(() => {
              clickConfirmButton()
              console.log("[AUTO-CLICK] BIG bet completed!")
              clickState.isExecuting = false
              resolve(true)
            }, CONFIG.CLICK_DELAY)
          })
        }, CONFIG.CLICK_DELAY * 2) // Wait longer for popup to appear
      } else if (prediction === "SMALL") {
        // SMALL: Trigger buttons 2 -> 5 -> 6
        console.log("[AUTO-CLICK] SMALL: Clicking Small -> Plus x" + plusClicks + " -> Confirm")

        // Step 1: Click Small button
        clickSmallButton()

        // Step 2: Wait for popup, then click plus
        setTimeout(() => {
          clickPlusButtonMultiple(plusClicks, () => {
            // Step 3: Click confirm
            setTimeout(() => {
              clickConfirmButton()
              console.log("[AUTO-CLICK] SMALL bet completed!")
              clickState.isExecuting = false
              resolve(true)
            }, CONFIG.CLICK_DELAY)
          })
        }, CONFIG.CLICK_DELAY * 2)
      } else {
        console.log("[AUTO-CLICK] Unknown prediction: " + prediction)
        clickState.isExecuting = false
        resolve(false)
      }
    })
  }

  // ============================================
  // MANUAL TEST FUNCTIONS (exposed globally)
  // ============================================

  window.botTestBigClick = () => {
    console.log("[TEST] Testing BIG button click sequence...")
    clickBigButton()
  }

  window.botTestSmallClick = () => {
    console.log("[TEST] Testing SMALL button click sequence...")
    clickSmallButton()
  }

  window.botTestPlusClick = (times) => {
    times = times || 5
    console.log("[TEST] Testing PLUS button " + times + " clicks...")
    clickPlusButtonMultiple(times)
  }

  window.botTestConfirmClick = () => {
    console.log("[TEST] Testing CONFIRM button click...")
    clickConfirmButton()
  }

  window.botTestFullBet = (type, amount) => {
    type = type || "BIG"
    amount = amount || 10
    console.log("[TEST] Testing full " + type + " bet with amount " + amount + "...")
    executeBet(type, amount)
  }

  window.botGetClickLog = () => {
    console.log("[CLICK LOG] Recent clicks:")
    clickState.clickLog.forEach((log) => {
      console.log(log.time + " | " + log.button + " | " + (log.success ? "OK" : "FAIL") + " | " + log.message)
    })
    return clickState.clickLog
  }

  window.botSetSelector = (buttonType, selector) => {
    if (BUTTON_SELECTORS[buttonType]) {
      BUTTON_SELECTORS[buttonType].unshift(selector)
      console.log("[CONFIG] Added selector for " + buttonType + ": " + selector)
    } else {
      console.log("[CONFIG] Unknown button type: " + buttonType)
      console.log("[CONFIG] Available: BIG_BUTTON, SMALL_BUTTON, PLUS_BUTTON, CONFIRM_BUTTON")
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function getColorFromNumber(num) {
    if (num === 1 || num === 3 || num === 5 || num === 7 || num === 9) return "GREEN"
    return "RED"
  }

  function getSizeFromNumber(num) {
    if (num >= 5) return "BIG"
    return "SMALL"
  }

  function getOppositeSizePrediction(previousSize) {
    return previousSize === "BIG" ? "SMALL" : "BIG"
  }

  function determineLevel(recentHistory) {
    var consecutiveLosses = 0

    for (var i = 0; i < recentHistory.length; i++) {
      var item = recentHistory[i]
      if (item.status === "LOSE") {
        consecutiveLosses++
      } else if (item.status === "WIN") {
        break
      } else {
        break
      }
    }

    var levelMap = { 0: 1, 1: 2, 2: 3, 3: 4 }

    if (consecutiveLosses >= 4) {
      return 1
    }

    return levelMap[consecutiveLosses] || 1
  }

  function predictLucifer(latestResultNumber) {
    var size = getSizeFromNumber(latestResultNumber)
    return {
      predictedValue: size,
      reason: "Lucifer Mode: Latest result " + latestResultNumber + " is " + size + ", predicting " + size,
    }
  }

  function predictNextColor(results, recentHistory, totalPredictions) {
    recentHistory = recentHistory || []
    totalPredictions = totalPredictions || 0

    var last50 = results.slice(0, Math.min(50, results.length))

    if (last50.length < 2) {
      return {
        predictedType: "SKIP",
        predictedValue: "SKIP",
        predictedNumber: null,
        confidence: 0,
        mode: "SKIP",
        level: 1,
        matchInfo: null,
        calculations: null,
        shouldPredict: false,
        reason: "Insufficient data (need at least 2 results)",
      }
    }

    var latestResult = last50[0].result_number
    var currentIssueNumber = results[0].issue_number
    var predictedIssueNumber = (BigInt(currentIssueNumber) + BigInt(1)).toString()

    var currentLevel = determineLevel(recentHistory)

    if (currentLevel === 3 || currentLevel === 4) {
      var previousSize = getSizeFromNumber(latestResult)
      var oppositePrediction = getOppositeSizePrediction(previousSize)

      return {
        predictedType: "SIZE",
        predictedValue: oppositePrediction,
        predictedNumber: null,
        confidence: 100,
        mode: "LEVEL_3",
        level: currentLevel,
        matchInfo: {
          latestResult: latestResult,
          totalMatches: 0,
          matchedValues: [],
          matchedValuesDisplay: [],
          colorCounts: { GREEN: 0, RED: 0 },
          sizeCounts: { BIG: 0, SMALL: 0 },
        },
        calculations: null,
        shouldPredict: true,
        predictedIssueNumber: predictedIssueNumber,
        reason:
          "Level " +
          currentLevel +
          ": Latest result " +
          latestResult +
          " is " +
          previousSize +
          ", predicting opposite: " +
          oppositePrediction,
      }
    }

    var luciferPrediction = predictLucifer(latestResult)

    return {
      predictedType: "SIZE",
      predictedValue: luciferPrediction.predictedValue,
      predictedNumber: null,
      confidence: 100,
      mode: "LUCIFER",
      level: currentLevel,
      matchInfo: {
        latestResult: latestResult,
        totalMatches: 0,
        matchedValues: [],
        matchedValuesDisplay: [],
        colorCounts: { GREEN: 0, RED: 0 },
        sizeCounts: { BIG: 0, SMALL: 0 },
      },
      calculations: null,
      shouldPredict: true,
      predictedIssueNumber: predictedIssueNumber,
      reason: "Level " + currentLevel + " (Lucifer): " + luciferPrediction.reason,
    }
  }

  // ============================================
  // TELEGRAM FUNCTIONS
  // ============================================

  function formatPredictionListForTelegram(predictions, currentLevel) {
    var message = "LUCIFER BOT ~ " + currentLevel + "/4 LVL \n"
    message += "━━━━━━━━━━━━━━━\n"

    var reversedPredictions = predictions.slice().reverse()

    for (var i = 0; i < reversedPredictions.length; i++) {
      var pred = reversedPredictions[i]
      var shortIssue = pred.number.substring(pred.number.length - 3)
      var statusEmoji = ""

      if (pred.status === "WIN") statusEmoji = " ✅"
      else if (pred.status === "LOSE") statusEmoji = " ❌"
      else statusEmoji = " ⏳"

      message += shortIssue + " | " + pred.prediction + statusEmoji + "\n"
    }

    message += "━━━━━━━━━━━━━━━\n"
    message += "t.me/LUCIFER_AUTOBOT"
    return message
  }

  function sendTelegramMessage(text, groupId) {
    var url =
      "https://api.telegram.org/bot" +
      CONFIG.TELEGRAM_BOT_API +
      "/sendMessage?chat_id=" +
      groupId +
      "&text=" +
      encodeURIComponent(text) +
      "&parse_mode=HTML"

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          console.log("[TG] Sent to " + groupId)
        }
      })
      .catch((e) => {
        console.log("[TG] Error: " + e.message)
      })
  }

  function broadcastToTelegram(message) {
    for (var i = 0; i < CONFIG.TELEGRAM_GROUP_IDS.length; i++) {
      sendTelegramMessage(message, CONFIG.TELEGRAM_GROUP_IDS[i])
    }
  }

  // ============================================
  // BETTING CONFIGURATION & STATE
  // ============================================

  var BETTING_CONFIG = {
    AUTO_BET_ENABLED: false,
    AUTO_CLICKER_ENABLED: true,
    BASE_BET: 10,
    MARTINGALE_MULTIPLIER: 2.2,
  }

  var bettingState = {
    balance: 1000,
    totalBets: 0,
    wins: 0,
    losses: 0,
    profitLoss: 0,
    currentBetAmount: 10,
    predictions: [],
    currentPrediction: null,
    currentLevel: 1,
  }

  function calculateBetAmount(level) {
    if (level === 1) return BETTING_CONFIG.BASE_BET
    return Math.round(BETTING_CONFIG.BASE_BET * Math.pow(BETTING_CONFIG.MARTINGALE_MULTIPLIER, level - 1))
  }

  // ============================================
  // MAIN LOOP
  // ============================================

  function fetchAndProcess() {
    fetch(CONFIG.RESULTS_API)
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.data || !data.data.length) return

        var results = data.data
        var latest = results[0]
        var currentIssue = latest.issue_number
        var resultNumber = Number.parseInt(latest.result_number, 10)

        // Update last 10 results
        state.last10Results = results.slice(0, 10).map((r) => ({
          issue: r.issue_number.substring(r.issue_number.length - 4),
          number: Number.parseInt(r.result_number, 10),
          size: getSizeFromNumber(Number.parseInt(r.result_number, 10)),
          color: getColorFromNumber(Number.parseInt(r.result_number, 10)),
        }))

        // Check if new result
        if (state.lastProcessedIssue !== currentIssue) {
          state.lastProcessedIssue = currentIssue

          // Check previous prediction
          if (bettingState.currentPrediction) {
            var actualSize = getSizeFromNumber(resultNumber)
            var isWin = bettingState.currentPrediction.value === actualSize

            // Update prediction status
            for (var i = 0; i < bettingState.predictions.length; i++) {
              if (bettingState.predictions[i].number === bettingState.currentPrediction.forIssue) {
                bettingState.predictions[i].status = isWin ? "WIN" : "LOSE"
                bettingState.predictions[i].actual = resultNumber
                break
              }
            }

            // Update stats
            bettingState.totalBets++
            if (isWin) {
              bettingState.wins++
              var winAmount = bettingState.currentBetAmount * 1.96
              bettingState.balance += winAmount
              bettingState.profitLoss += winAmount - bettingState.currentBetAmount
              console.log("[BOT] WIN! +" + winAmount.toFixed(2))
            } else {
              bettingState.losses++
              bettingState.profitLoss -= bettingState.currentBetAmount
              console.log("[BOT] LOSE! -" + bettingState.currentBetAmount)
            }

            // Send Telegram update
            var tgMsg = formatPredictionListForTelegram(bettingState.predictions.slice(-10), bettingState.currentLevel)
            broadcastToTelegram(tgMsg)
          }

          // Generate new prediction
          var prediction = predictNextColor(results, bettingState.predictions)

          if (prediction.shouldPredict) {
            bettingState.currentLevel = prediction.level
            bettingState.currentBetAmount = calculateBetAmount(prediction.level)

            var newPred = {
              number: prediction.predictedIssueNumber,
              prediction: prediction.predictedValue,
              status: "PENDING",
              actual: null,
              level: prediction.level,
              betAmount: bettingState.currentBetAmount,
            }

            bettingState.predictions.push(newPred)
            if (bettingState.predictions.length > 20) {
              bettingState.predictions.shift()
            }

            bettingState.currentPrediction = {
              forIssue: prediction.predictedIssueNumber,
              value: prediction.predictedValue,
            }

            console.log(
              "[BOT] Prediction for " +
                prediction.predictedIssueNumber.slice(-4) +
                ": " +
                prediction.predictedValue +
                " (Level " +
                prediction.level +
                ", Bet: " +
                bettingState.currentBetAmount +
                ")",
            )

            // Execute auto-bet if enabled
            if (BETTING_CONFIG.AUTO_BET_ENABLED && BETTING_CONFIG.AUTO_CLICKER_ENABLED) {
              executeBet(prediction.predictedValue, bettingState.currentBetAmount)
            }
          }

          updateUI()
        }
      })
      .catch((e) => {
        console.log("[BOT] Fetch error: " + e.message)
      })
  }

  // ============================================
  // UI RENDERING
  // ============================================

  function createUI() {
    var container = document.createElement("div")
    container.id = "lucifer-bot-ui"
    container.innerHTML = [
      '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1a2e;color:#fff;font-family:Arial,sans-serif;overflow-y:auto;z-index:99999;padding:15px;">',
      '<div style="max-width:400px;margin:0 auto;">',
      // Header
      '<h1 style="color:#ff6b35;font-size:24px;margin:0 0 5px;">LUCIFER AUTO BOT</h1>',
      '<p style="color:#888;font-size:12px;margin:0 0 15px;">Automatic Prediction & Betting System</p>',
      // Auto-bet toggle
      '<div id="auto-bet-status" style="background:#2d2d44;padding:12px;border-radius:8px;text-align:center;margin-bottom:15px;border:2px solid #ff4757;">',
      '<span style="color:#ff4757;font-weight:bold;">AUTO BETTING: INACTIVE</span>',
      "</div>",
      // Stats grid
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">',
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;">',
      '<div style="color:#888;font-size:11px;">Balance</div>',
      '<div id="stat-balance" style="color:#00d4aa;font-size:24px;font-weight:bold;">1000.00</div>',
      "</div>",
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;">',
      '<div style="color:#888;font-size:11px;">Profit/Loss</div>',
      '<div id="stat-pnl" style="color:#00d4aa;font-size:24px;font-weight:bold;">+0.00</div>',
      "</div>",
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;">',
      '<div style="color:#888;font-size:11px;">Win Rate</div>',
      '<div id="stat-winrate" style="color:#ff6b35;font-size:24px;font-weight:bold;">0.0%</div>',
      "</div>",
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;">',
      '<div style="color:#888;font-size:11px;">Total Bets</div>',
      '<div id="stat-totalbets" style="color:#ff6b35;font-size:24px;font-weight:bold;">0</div>',
      "</div>",
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;">',
      '<div style="color:#888;font-size:11px;">Wins</div>',
      '<div id="stat-wins" style="color:#00d4aa;font-size:24px;font-weight:bold;">0</div>',
      "</div>",
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;">',
      '<div style="color:#888;font-size:11px;">Losses</div>',
      '<div id="stat-losses" style="color:#ff4757;font-size:24px;font-weight:bold;">0</div>',
      "</div>",
      "</div>",
      // Prediction card
      '<div style="background:linear-gradient(135deg,#2d2d44,#3d3d5c);padding:20px;border-radius:12px;text-align:center;margin-bottom:15px;">',
      '<div style="font-size:14px;margin-bottom:10px;">Current Prediction</div>',
      '<div id="level-badge" style="display:inline-block;background:#ff6b35;color:#fff;padding:5px 15px;border-radius:20px;font-size:12px;margin-bottom:10px;">LEVEL 1</div>',
      '<div id="prediction-value" style="font-size:36px;font-weight:bold;color:#00d4aa;">---</div>',
      '<div id="prediction-issue" style="color:#888;font-size:12px;margin-top:5px;">For Issue: ----</div>',
      '<div style="display:flex;justify-content:space-around;margin-top:15px;padding-top:15px;border-top:1px solid #444;">',
      '<div><span style="color:#888;font-size:11px;">Next Bet Amount</span><div id="next-bet" style="color:#ff6b35;font-weight:bold;">10</div></div>',
      '<div><span style="color:#888;font-size:11px;">Current Level</span><div id="current-level" style="color:#ff6b35;font-weight:bold;">1/4</div></div>',
      "</div>",
      "</div>",
      // Control buttons
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">',
      '<button id="btn-toggle" style="background:#ff6b35;color:#fff;border:none;padding:15px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">START AUTO BET</button>',
      '<button id="btn-clicker" style="background:#00d4aa;color:#fff;border:none;padding:15px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">CLICKER: ON</button>',
      "</div>",
      // Manual bet buttons
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">',
      '<button id="btn-manual-big" style="background:#ff6b35;color:#fff;border:none;padding:12px;border-radius:8px;font-size:12px;cursor:pointer;">MANUAL BIG</button>',
      '<button id="btn-manual-small" style="background:#5dade2;color:#fff;border:none;padding:12px;border-radius:8px;font-size:12px;cursor:pointer;">MANUAL SMALL</button>',
      "</div>",
      // Recent results
      '<div style="background:#2d2d44;padding:15px;border-radius:8px;margin-bottom:15px;">',
      '<div style="font-size:12px;color:#888;margin-bottom:10px;">Recent Results</div>',
      '<div id="recent-results" style="display:flex;gap:5px;flex-wrap:wrap;"></div>',
      "</div>",
      // History table
      '<div style="background:#2d2d44;border-radius:8px;overflow:hidden;">',
      '<div style="padding:10px;border-bottom:1px solid #444;font-size:12px;color:#888;">Prediction History</div>',
      '<div id="history-list" style="max-height:200px;overflow-y:auto;"></div>',
      "</div>",
      // Close button
      '<button id="btn-close" style="width:100%;background:#333;color:#888;border:none;padding:12px;margin-top:15px;border-radius:8px;cursor:pointer;">MINIMIZE BOT</button>',
      "</div>",
      "</div>",
    ].join("")

    document.body.appendChild(container)

    // Event listeners
    document.getElementById("btn-toggle").addEventListener("click", function () {
      BETTING_CONFIG.AUTO_BET_ENABLED = !BETTING_CONFIG.AUTO_BET_ENABLED
      this.textContent = BETTING_CONFIG.AUTO_BET_ENABLED ? "STOP AUTO BET" : "START AUTO BET"
      this.style.background = BETTING_CONFIG.AUTO_BET_ENABLED ? "#ff4757" : "#ff6b35"
      updateUI()
    })

    document.getElementById("btn-clicker").addEventListener("click", function () {
      BETTING_CONFIG.AUTO_CLICKER_ENABLED = !BETTING_CONFIG.AUTO_CLICKER_ENABLED
      this.textContent = BETTING_CONFIG.AUTO_CLICKER_ENABLED ? "CLICKER: ON" : "CLICKER: OFF"
      this.style.background = BETTING_CONFIG.AUTO_CLICKER_ENABLED ? "#00d4aa" : "#666"
    })

    document.getElementById("btn-manual-big").addEventListener("click", () => {
      executeBet("BIG", bettingState.currentBetAmount)
    })

    document.getElementById("btn-manual-small").addEventListener("click", () => {
      executeBet("SMALL", bettingState.currentBetAmount)
    })

    document.getElementById("btn-close").addEventListener("click", () => {
      container.style.display = "none"
      createMinimizedButton()
    })
  }

  function createMinimizedButton() {
    var btn = document.createElement("div")
    btn.id = "lucifer-mini"
    btn.innerHTML = "🔥"
    btn.style.cssText =
      "position:fixed;bottom:80px;right:20px;width:50px;height:50px;background:#ff6b35;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;z-index:99998;box-shadow:0 4px 15px rgba(255,107,53,0.4);"
    btn.addEventListener("click", () => {
      document.getElementById("lucifer-bot-ui").style.display = "block"
      btn.remove()
    })
    document.body.appendChild(btn)
  }

  function updateUI() {
    var winRate = bettingState.totalBets > 0 ? ((bettingState.wins / bettingState.totalBets) * 100).toFixed(1) : "0.0"

    document.getElementById("stat-balance").textContent = bettingState.balance.toFixed(2)

    var pnlEl = document.getElementById("stat-pnl")
    pnlEl.textContent = (bettingState.profitLoss >= 0 ? "+" : "") + bettingState.profitLoss.toFixed(2)
    pnlEl.style.color = bettingState.profitLoss >= 0 ? "#00d4aa" : "#ff4757"

    document.getElementById("stat-winrate").textContent = winRate + "%"
    document.getElementById("stat-totalbets").textContent = bettingState.totalBets
    document.getElementById("stat-wins").textContent = bettingState.wins
    document.getElementById("stat-losses").textContent = bettingState.losses

    // Auto-bet status
    var statusEl = document.getElementById("auto-bet-status")
    if (BETTING_CONFIG.AUTO_BET_ENABLED) {
      statusEl.innerHTML = '<span style="color:#00d4aa;font-weight:bold;">AUTO BETTING: ACTIVE</span>'
      statusEl.style.borderColor = "#00d4aa"
    } else {
      statusEl.innerHTML = '<span style="color:#ff4757;font-weight:bold;">AUTO BETTING: INACTIVE</span>'
      statusEl.style.borderColor = "#ff4757"
    }

    // Prediction
    if (bettingState.currentPrediction) {
      var predEl = document.getElementById("prediction-value")
      predEl.textContent = bettingState.currentPrediction.value
      predEl.style.color = bettingState.currentPrediction.value === "BIG" ? "#ff6b35" : "#5dade2"
      document.getElementById("prediction-issue").textContent =
        "For Issue: " + bettingState.currentPrediction.forIssue.slice(-4)
    }

    document.getElementById("level-badge").textContent = "LEVEL " + bettingState.currentLevel
    document.getElementById("next-bet").textContent = bettingState.currentBetAmount
    document.getElementById("current-level").textContent = bettingState.currentLevel + "/4"

    // Recent results
    var recentEl = document.getElementById("recent-results")
    recentEl.innerHTML = state.last10Results
      .map((r) => {
        var bgColor = r.size === "BIG" ? "#ff6b35" : "#5dade2"
        return (
          '<div style="width:30px;height:30px;background:' +
          bgColor +
          ';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">' +
          r.number +
          "</div>"
        )
      })
      .join("")

    // History
    var historyEl = document.getElementById("history-list")
    historyEl.innerHTML = bettingState.predictions
      .slice()
      .reverse()
      .slice(0, 15)
      .map((p) => {
        var statusColor = p.status === "WIN" ? "#00d4aa" : p.status === "LOSE" ? "#ff4757" : "#888"
        var statusText = p.status === "WIN" ? "✓" : p.status === "LOSE" ? "✗" : "..."
        return (
          '<div style="display:flex;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #333;font-size:12px;">' +
          '<span style="color:#888;">' +
          p.number.slice(-4) +
          "</span>" +
          '<span style="color:' +
          (p.prediction === "BIG" ? "#ff6b35" : "#5dade2") +
          ';">' +
          p.prediction +
          "</span>" +
          '<span style="color:' +
          statusColor +
          ';">' +
          statusText +
          "</span>" +
          "</div>"
        )
      })
      .join("")
  }

  // ============================================
  // GLOBAL CONTROLS
  // ============================================

  window.botToggleAutoBet = () => {
    BETTING_CONFIG.AUTO_BET_ENABLED = !BETTING_CONFIG.AUTO_BET_ENABLED
    console.log("[BOT] Auto-bet: " + (BETTING_CONFIG.AUTO_BET_ENABLED ? "ON" : "OFF"))
    updateUI()
  }

  window.botToggleClicker = () => {
    BETTING_CONFIG.AUTO_CLICKER_ENABLED = !BETTING_CONFIG.AUTO_CLICKER_ENABLED
    console.log("[BOT] Auto-clicker: " + (BETTING_CONFIG.AUTO_CLICKER_ENABLED ? "ON" : "OFF"))
  }

  window.botSetBalance = (amount) => {
    bettingState.balance = amount
    updateUI()
  }

  window.botSetBaseBet = (amount) => {
    BETTING_CONFIG.BASE_BET = amount
    bettingState.currentBetAmount = amount
    updateUI()
  }

  window.botClearHistory = () => {
    bettingState.predictions = []
    bettingState.totalBets = 0
    bettingState.wins = 0
    bettingState.losses = 0
    bettingState.profitLoss = 0
    updateUI()
  }

  // ============================================
  // INITIALIZE
  // ============================================

  console.log("========================================")
  console.log("LUCIFER AUTO BOT LOADED")
  console.log("========================================")
  console.log("Commands:")
  console.log("  botToggleAutoBet() - Toggle auto betting")
  console.log("  botToggleClicker() - Toggle auto clicker")
  console.log("  botSetBalance(1000) - Set balance")
  console.log("  botSetBaseBet(10) - Set base bet")
  console.log("  botTestBigClick() - Test big button")
  console.log("  botTestSmallClick() - Test small button")
  console.log("  botTestPlusClick(10) - Test plus x10")
  console.log("  botTestConfirmClick() - Test confirm")
  console.log("  botTestFullBet('BIG', 15) - Full test")
  console.log("  botGetClickLog() - View click log")
  console.log("  botSetSelector('BIG_BUTTON', '.my-selector')")
  console.log("========================================")

  createUI()
  setInterval(fetchAndProcess, CONFIG.FETCH_INTERVAL)
  fetchAndProcess()
})()
