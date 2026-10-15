(function () {
  "use strict";

  var STORAGE_KEY = "basketball-shot-chart-v5";
  var LEGACY_KEY = "basketball-shot-chart-v4";
  var SVG_NS = "http://www.w3.org/2000/svg";

  var DRILL_NAMES = {
    "free-throws": "Штрафные броски",
    "mikan": "Mikan Drill",
    "midrange": "Средняя дистанция",
    "three-points": "Трёхочковые",
    "five-spots": "Пять точек"
  };

  var TRAINING_PROGRAMS = {
    "free-throws": {
      title: "Штрафные: стабильность",
      description: "Спокойная работа над одинаковой механикой и ритмом каждого штрафного.",
      sets: 5,
      shotsPerSet: 10,
      focus: "50 бросков · фиксируйте рутину перед каждым броском"
    },
    "mikan": {
      title: "Mikan Drill",
      description: "Попеременные завершения справа и слева для уверенной игры под кольцом.",
      sets: 3,
      shotsPerSet: 20,
      focus: "60 бросков · меняйте руку после каждого завершения"
    },
    "midrange": {
      title: "Средняя дистанция: пять точек",
      description: "Серии с левого угла, крыла, центра, правого крыла и правого угла.",
      sets: 5,
      shotsPerSet: 10,
      focus: "50 бросков · одна серия с каждой позиции"
    },
    "three-points": {
      title: "Трёхочковые по периметру",
      description: "Работа над дальним броском с обеих сторон площадки и из центра.",
      sets: 5,
      shotsPerSet: 10,
      focus: "50 бросков · сохраняйте игровой темп"
    },
    "five-spots": {
      title: "Пять точек: игровой темп",
      description: "Короткие серии с пяти основных позиций с быстрым переходом между ними.",
      sets: 5,
      shotsPerSet: 5,
      focus: "25 бросков · отмечайте каждую попытку сразу"
    }
  };

  var SIDE_LABELS = {
    left: "Слева",
    center: "По центру",
    right: "Справа"
  };

  var RANGE_LABELS = {
    close: "Под кольцом",
    mid: "Средняя дистанция",
    three: "Трёхочковый"
  };

  var state = {
    workouts: [],
    shots: [],
    drills: [],
    activeWorkoutId: null,
    activeDrillId: null,
    selectedResult: "made",
    confirmationAction: null,
    pendingImport: null
  };

  var elements = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function findElements() {
    [
      "workout-form",
      "workout-title",
      "workout-date",
      "workout-notes",
      "program-fields",
      "program-type",
      "program-preview",
      "create-button-text",
      "form-message",
      "workout-list",
      "workout-count",
      "current-title",
      "current-meta",
      "finish-workout-button",
      "delete-workout-button",
      "undo-shot-button",
      "basketball-court",
      "court-lock",
      "court-empty-hint",
      "court-tooltip",
      "court-message",
      "shot-layer",
      "total-shots",
      "made-shots",
      "missed-shots",
      "field-goal-percent",
      "current-streak",
      "recent-shots",
      "zone-stats",
      "all-total-shots",
      "all-made-shots",
      "all-field-goal-percent",
      "guided-progress-panel",
      "active-program-title",
      "drill-status",
      "drill-progress-block",
      "active-drill-name",
      "drill-progress-text",
      "drill-progress-fill",
      "series-list",
      "accuracy-chart",
      "chart-wrapper",
      "chart-empty",
      "chart-trend",
      "export-button",
      "import-button",
      "import-file",
      "compare-button",
      "confirmation-dialog",
      "confirmation-icon",
      "confirmation-title",
      "confirmation-text",
      "confirmation-cancel",
      "confirmation-accept",
      "analysis-dialog",
      "analysis-close",
      "analysis-grade",
      "analysis-summary",
      "strong-zone-title",
      "strong-zone-text",
      "weak-zone-title",
      "weak-zone-text",
      "recommendation-list",
      "compare-dialog",
      "compare-close",
      "compare-first",
      "compare-second",
      "run-comparison",
      "compare-message",
      "comparison-result",
      "app-toast",
      "toast-icon",
      "toast-text"
    ].forEach(function (id) {
      elements[id] = byId(id);
    });

    elements.resultButtons = document.querySelectorAll(".result-button");
    elements.modeInputs = document.querySelectorAll(
      'input[name="workout-mode"]'
    );
    elements.modeCards = document.querySelectorAll(".mode-card");
  }

  function createId() {
    return Date.now().toString(36) + "-" +
      Math.random().toString(36).substring(2, 10);
  }

  function getToday() {
    var date = new Date();

    return date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    var parts = value.split("-");

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(
      new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    );
  }

  function percentage(made, total) {
    return total ? made / total * 100 : 0;
  }

  function showMessage(element, text, type, duration) {
    window.clearTimeout(element.messageHideTimer);
    window.clearTimeout(element.messageClearTimer);

    element.textContent = text;
    element.className = "message" + (type ? " " + type : "");

    if (duration) {
      element.messageHideTimer = window.setTimeout(function () {
        element.classList.add("is-hiding");

        element.messageClearTimer = window.setTimeout(function () {
          element.textContent = "";
          element.className = "message";
        }, 220);
      }, duration);
    }
  }

  var toastTimer = null;
  var undoTimer = null;

  function showToast(text, type) {
    window.clearTimeout(toastTimer);
    elements["toast-text"].textContent = text;
    elements["toast-icon"].textContent = type === "error" ? "!" : "✓";
    elements["app-toast"].className =
      "app-toast is-visible" + (type === "error" ? " error" : "");
    elements["app-toast"].hidden = false;

    toastTimer = window.setTimeout(function () {
      elements["app-toast"].classList.remove("is-visible");

      window.setTimeout(function () {
        elements["app-toast"].hidden = true;
      }, 240);
    }, 2800);
  }

  function getSelectedWorkoutMode() {
    var selected = document.querySelector(
      'input[name="workout-mode"]:checked'
    );

    return selected ? selected.value : "free";
  }

  function updateProgramPreview(shouldUpdateTitle) {
    var mode = getSelectedWorkoutMode();
    var isGuided = mode === "guided";
    var program = TRAINING_PROGRAMS[elements["program-type"].value];

    elements["program-fields"].hidden = !isGuided;
    elements["create-button-text"].textContent = isGuided
      ? "Запустить готовую программу"
      : "Начать свободную тренировку";

    elements.modeCards.forEach(function (card) {
      var input = card.querySelector("input");
      card.classList.toggle("active", input.checked);
    });

    if (!program) {
      return;
    }

    elements["program-preview"].innerHTML =
      "<strong>" + program.focus + "</strong>" +
      "<span>" + program.description + "</span>";

    if (isGuided && shouldUpdateTitle) {
      elements["workout-title"].value = program.title;
    } else if (!isGuided && shouldUpdateTitle) {
      var generatedTitle = Object.keys(TRAINING_PROGRAMS).some(function (key) {
        return elements["workout-title"].value ===
          TRAINING_PROGRAMS[key].title;
      });

      if (generatedTitle) {
        elements["workout-title"].value = "";
      }
    }
  }

  function getWorkout(id) {
    return state.workouts.find(function (workout) {
      return workout.id === id;
    }) || null;
  }

  function getActiveWorkout() {
    return getWorkout(state.activeWorkoutId);
  }

  function getWorkoutShots(id) {
    return state.shots.filter(function (shot) {
      return shot.workoutId === id;
    });
  }

  function getActiveShots() {
    return getWorkoutShots(state.activeWorkoutId);
  }

  function getActiveDrill() {
    return state.drills.find(function (drill) {
      return drill.id === state.activeDrillId;
    }) || null;
  }

  function getDrillShots(id) {
    return state.shots.filter(function (shot) {
      return shot.drillId === id;
    });
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 5,
      workouts: state.workouts,
      shots: state.shots,
      drills: state.drills,
      activeWorkoutId: state.activeWorkoutId,
      activeDrillId: state.activeDrillId
    }));
  }

  function loadData() {
    var raw = localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_KEY);

    if (!raw) {
      return;
    }

    try {
      var data = JSON.parse(raw);

      state.workouts = Array.isArray(data.workouts) ? data.workouts : [];
      state.shots = Array.isArray(data.shots) ? data.shots : [];
      state.drills = Array.isArray(data.drills) ? data.drills : [];
      state.activeWorkoutId = data.activeWorkoutId || null;
      state.activeDrillId = data.activeDrillId || null;
    } catch (error) {
      console.error("Ошибка чтения данных:", error);
    }
  }

  function classifyShot(x, y) {
    var distance = Math.hypot(x - 0.5, y - 0.12);
    var side = x < 0.37 ? "left" : x > 0.63 ? "right" : "center";
    var cornerThree = y < 0.35 && (x <= 0.13 || x >= 0.87);
    var range = cornerThree || distance >= 0.43
      ? "three"
      : distance <= 0.17 ? "close" : "mid";

    return {
      key: side + "-" + range,
      side: side,
      range: range,
      label: SIDE_LABELS[side] + " · " + RANGE_LABELS[range]
    };
  }

  function getZoneStats(shots) {
    var map = {};

    shots.forEach(function (shot) {
      var zone = classifyShot(shot.x, shot.y);

      if (!map[zone.key]) {
        map[zone.key] = {
          key: zone.key,
          label: zone.label,
          attempts: 0,
          made: 0
        };
      }

      map[zone.key].attempts += 1;

      if (shot.result === "made") {
        map[zone.key].made += 1;
      }
    });

    return Object.keys(map).map(function (key) {
      var zone = map[key];

      zone.percent = percentage(zone.made, zone.attempts);
      return zone;
    });
  }

  function getWorkoutStats(workoutId) {
    var shots = getWorkoutShots(workoutId);
    var made = shots.filter(function (shot) {
      return shot.result === "made";
    }).length;

    return {
      total: shots.length,
      made: made,
      missed: shots.length - made,
      percent: percentage(made, shots.length),
      zones: getZoneStats(shots)
    };
  }

  function renderWorkoutList() {
    var list = elements["workout-list"];

    list.innerHTML = "";
    elements["workout-count"].textContent = state.workouts.length || "—";

    if (!state.workouts.length) {
      list.innerHTML = '<p class="empty-state">Тренировок пока нет.</p>';
      return;
    }

    state.workouts.slice().sort(function (a, b) {
      return b.workoutDate.localeCompare(a.workoutDate) ||
        b.createdAt.localeCompare(a.createdAt);
    }).forEach(function (workout) {
      var stats = getWorkoutStats(workout.id);
      var button = document.createElement("button");
      var title = document.createElement("strong");
      var meta = document.createElement("span");
      var fg = document.createElement("b");

      button.type = "button";
      button.className = "workout-item";

      if (workout.id === state.activeWorkoutId) {
        button.classList.add("active");
      }

      title.textContent = workout.title;
      meta.textContent =
        formatDate(workout.workoutDate) + " · " +
        stats.total + " бросков · " +
        (workout.finishedAt ? "завершена" : "активна");

      fg.className = "workout-fg";
      fg.textContent = stats.total ? stats.percent.toFixed(0) + "%" : "—";

      if (workout.finishedAt) {
        meta.classList.add("finished");
      }

      button.append(title, meta, fg);

      button.addEventListener("click", function () {
        state.activeWorkoutId = workout.id;
        var workoutDrills = state.drills.filter(function (drill) {
          return drill.workoutId === workout.id;
        }).sort(function (a, b) {
          return b.createdAt.localeCompare(a.createdAt);
        });

        state.activeDrillId = workoutDrills.length
          ? workoutDrills[0].id
          : null;

        saveData();
        renderAll();
      });

      list.appendChild(button);
    });
  }

  function renderActiveWorkout() {
    var workout = getActiveWorkout();
    var shots = getActiveShots();

    if (!workout) {
      document.body.classList.remove("has-active-workout");
      elements["current-title"].textContent = "Выберите тренировку";
      elements["current-meta"].textContent =
        "Создайте тренировку или откройте её из истории.";
      elements["finish-workout-button"].disabled = true;
      elements["delete-workout-button"].disabled = true;
      elements["undo-shot-button"].disabled = true;
      elements["court-lock"].hidden = true;
      return;
    }

    document.body.classList.toggle(
      "has-active-workout",
      !workout.finishedAt
    );

    elements["current-title"].textContent = workout.title;

    elements["current-meta"].textContent = [
      formatDate(workout.workoutDate),
      workout.mode === "guided" ? "Готовая программа" : "Свободная тренировка",
      workout.notes,
      workout.finishedAt ? "Тренировка завершена" : "Тренировка активна"
    ].filter(Boolean).join(" · ");

    elements["delete-workout-button"].disabled = false;

    elements["finish-workout-button"].disabled =
      !workout.finishedAt && !shots.length;

    elements["finish-workout-button"].textContent = workout.finishedAt
      ? "Показать анализ"
      : "Завершить тренировку";

    elements["undo-shot-button"].disabled =
      Boolean(workout.finishedAt) || !shots.length;

    elements["court-lock"].hidden = !workout.finishedAt;
    elements.resultButtons.forEach(function (button) {
      button.disabled = Boolean(workout.finishedAt);
    });
  }

  function renderStatistics() {
    var stats = getWorkoutStats(state.activeWorkoutId);
    var activeShots = getActiveShots();
    var hasShots = stats.total > 0;

    elements["total-shots"].textContent = hasShots ? stats.total : "—";
    elements["made-shots"].textContent = hasShots ? stats.made : "—";
    elements["missed-shots"].textContent = hasShots ? stats.missed : "—";
    elements["field-goal-percent"].textContent =
      hasShots ? stats.percent.toFixed(1) : "—";

    var streak = 0;

    for (var index = activeShots.length - 1; index >= 0; index -= 1) {
      if (activeShots[index].result !== "made") {
        break;
      }

      streak += 1;
    }

    elements["current-streak"].textContent =
      "Серия: " + (hasShots ? streak : "—");

    elements["recent-shots"].innerHTML = "";

    activeShots.slice(-10).forEach(function (shot) {
      var dot = document.createElement("i");

      dot.className = "recent-dot " + shot.result;
      dot.title = shot.result === "made" ? "Попадание" : "Промах";
      elements["recent-shots"].appendChild(dot);
    });

    var zoneContainer = elements["zone-stats"];

    zoneContainer.innerHTML = "";

    if (!stats.total) {
      zoneContainer.innerHTML =
        '<p class="empty-state">Зоны появятся после первого броска.</p>';
    } else {
      stats.zones.sort(function (a, b) {
        return b.attempts - a.attempts;
      }).forEach(function (zone) {
        var row = document.createElement("div");

        row.className = "zone-row";
        row.innerHTML =
          "<span>" + zone.label + " · " +
          zone.made + "/" + zone.attempts + "</span>" +
          "<strong>" + zone.percent.toFixed(1) + "%</strong>" +
          '<div class="progress-track">' +
          '<div class="progress-fill" style="width:' +
          zone.percent + '%"></div></div>';

        zoneContainer.appendChild(row);
      });
    }

    var allMade = state.shots.filter(function (shot) {
      return shot.result === "made";
    }).length;

    elements["all-total-shots"].textContent = state.shots.length || "—";
    elements["all-made-shots"].textContent = state.shots.length
      ? allMade
      : "—";
    elements["all-field-goal-percent"].textContent =
      state.shots.length
        ? percentage(allMade, state.shots.length).toFixed(1) + "%"
        : "—";

    renderCourtHeatmap(stats);
  }

  function renderCourtHeatmap(stats) {
    var zoneMap = {};

    stats.zones.forEach(function (zone) {
      zoneMap[zone.key] = zone;
    });

    document.querySelectorAll(".heat-zone").forEach(function (element) {
      var zone = zoneMap[element.dataset.zone];
      var intensity = zone ? .1 + zone.percent / 100 * .5 : .035;

      element.style.fill = "rgba(233,120,46," + intensity + ")";
      element.setAttribute(
        "aria-label",
        zone
          ? zone.label + ": " + zone.made + " из " + zone.attempts +
            ", " + zone.percent.toFixed(1) + "%"
          : "В этой зоне пока нет бросков"
      );
    });

    document.querySelectorAll("[data-zone-label]").forEach(function (group) {
      var zone = zoneMap[group.dataset.zoneLabel];
      var percent = group.querySelector(".zone-percent");
      var detail = group.querySelector(".zone-detail");

      percent.textContent = zone ? zone.percent.toFixed(0) + "%" : "—";

      if (zone) {
        detail.textContent = zone.label + " · " + zone.made + "/" +
          zone.attempts;
      } else {
        var parts = group.dataset.zoneLabel.split("-");

        detail.textContent = SIDE_LABELS[parts[0]] + " · " +
          RANGE_LABELS[parts[1]];
      }
    });

    elements["court-empty-hint"].hidden = stats.total > 0;
  }

  function createShotMarker(shot, isNewest) {
    var group = document.createElementNS(SVG_NS, "g");
    var x = shot.x * 700;
    var y = shot.y * 760;

    group.setAttribute("pointer-events", "none");
    group.setAttribute("data-shot-id", shot.id);
    group.setAttribute(
      "class",
      "shot-marker" + (isNewest ? " is-new" : "")
    );

    if (shot.result === "made") {
      var circle = document.createElementNS(SVG_NS, "circle");

      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "11");
      circle.setAttribute("fill", "#b7d84b");
      circle.setAttribute("stroke", "#26300c");
      circle.setAttribute("stroke-width", "3");

      group.appendChild(circle);
    } else {
      [
        [x - 10, y - 10, x + 10, y + 10],
        [x + 10, y - 10, x - 10, y + 10]
      ].forEach(function (points) {
        var line = document.createElementNS(SVG_NS, "line");

        line.setAttribute("x1", points[0]);
        line.setAttribute("y1", points[1]);
        line.setAttribute("x2", points[2]);
        line.setAttribute("y2", points[3]);
        line.setAttribute("stroke", "#f06455");
        line.setAttribute("stroke-width", "7");
        line.setAttribute("stroke-linecap", "round");

        group.appendChild(line);
      });
    }

    if (isNewest) {
      var ring = document.createElementNS(SVG_NS, "circle");

      ring.setAttribute("class", "shot-ring");
      ring.setAttribute("cx", x);
      ring.setAttribute("cy", y);
      ring.setAttribute("r", "15");
      ring.setAttribute(
        "stroke",
        shot.result === "made" ? "#b7d84b" : "#f06455"
      );
      group.insertBefore(ring, group.firstChild);
    }

    return group;
  }

  function renderShots() {
    elements["shot-layer"].innerHTML = "";

    var shots = getActiveShots();

    shots.forEach(function (shot, index) {
      elements["shot-layer"].appendChild(
        createShotMarker(shot, index === shots.length - 1)
      );
    });
  }

  function renderDrill() {
    var drill = getActiveDrill();
    var block = elements["drill-progress-block"];
    var panel = elements["guided-progress-panel"];

    if (!drill || drill.workoutId !== state.activeWorkoutId) {
      panel.hidden = true;
      block.hidden = true;
      return;
    }

    var shots = getDrillShots(drill.id);
    var target = drill.sets * drill.shotsPerSet;
    var progress = Math.min(100, shots.length / target * 100);

    panel.hidden = false;
    block.hidden = false;
    elements["active-program-title"].textContent = drill.name;
    elements["active-drill-name"].textContent = drill.name;
    elements["drill-progress-fill"].style.width = progress + "%";

    elements["drill-status"].textContent = drill.finishedAt
      ? "Завершено"
      : "Выполняется";

    elements["drill-progress-text"].textContent =
      shots.length + " / " + target + " бросков";

    var seriesList = elements["series-list"];

    seriesList.innerHTML = "";

    for (var set = 0; set < drill.sets; set += 1) {
      var from = set * drill.shotsPerSet;
      var to = Math.min(from + drill.shotsPerSet, shots.length);
      var setShots = shots.slice(from, to);
      var setMade = setShots.filter(function (shot) {
        return shot.result === "made";
      }).length;

      var chip = document.createElement("span");

      chip.className = "series-chip";

      if (setShots.length === drill.shotsPerSet) {
        chip.classList.add("complete");
      }

      chip.textContent =
        "Серия " + (set + 1) + ": " +
        setMade + "/" + setShots.length;

      seriesList.appendChild(chip);
    }
  }

  function renderChart() {
    var data = state.workouts
      .filter(function (workout) {
        return workout.finishedAt &&
          getWorkoutStats(workout.id).total > 0;
      })
      .sort(function (a, b) {
        return a.workoutDate.localeCompare(b.workoutDate);
      });

    var svg = elements["accuracy-chart"];

    svg.innerHTML = "";

    if (!data.length) {
      elements["chart-empty"].hidden = false;
      elements["chart-wrapper"].hidden = true;
      elements["chart-trend"].textContent = "Недостаточно данных";
      return;
    }

    elements["chart-empty"].hidden = true;
    elements["chart-wrapper"].hidden = false;

    var width = 900;
    var height = 360;
    var left = 65;
    var right = 30;
    var top = 25;
    var bottom = 65;
    var graphWidth = width - left - right;
    var graphHeight = height - top - bottom;

    var points = data.map(function (workout, index) {
      var stats = getWorkoutStats(workout.id);
      var x = data.length === 1
        ? left + graphWidth / 2
        : left + index * graphWidth / (data.length - 1);

      var y = top + graphHeight -
        stats.percent / 100 * graphHeight;

      return {
        x: x,
        y: y,
        value: stats.percent,
        workout: workout,
        stats: stats
      };
    });

    [0, 25, 50, 75, 100].forEach(function (value) {
      var y = top + graphHeight - value / 100 * graphHeight;
      var line = document.createElementNS(SVG_NS, "line");
      var label = document.createElementNS(SVG_NS, "text");

      line.setAttribute("x1", left);
      line.setAttribute("x2", width - right);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "rgba(184,180,170,.18)");

      label.setAttribute("x", left - 12);
      label.setAttribute("y", y + 5);
      label.setAttribute("fill", "#b8b4aa");
      label.setAttribute("text-anchor", "end");
      label.textContent = value + "%";

      svg.append(line, label);
    });

    var area = document.createElementNS(SVG_NS, "path");
    var linePath = document.createElementNS(SVG_NS, "path");

    var path = points.map(function (point, index) {
      return (index ? "L" : "M") + point.x + " " + point.y;
    }).join(" ");

    area.setAttribute(
      "d",
      path +
      " L" + points[points.length - 1].x + " " + (top + graphHeight) +
      " L" + points[0].x + " " + (top + graphHeight) + " Z"
    );

    area.setAttribute("fill", "rgba(233,120,46,.08)");

    linePath.setAttribute("d", path);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", "#e9782e");
    linePath.setAttribute("stroke-width", "5");
    linePath.setAttribute("stroke-linecap", "round");
    linePath.setAttribute("stroke-linejoin", "round");

    svg.append(area, linePath);

    points.forEach(function (point) {
      var circle = document.createElementNS(SVG_NS, "circle");
      var value = document.createElementNS(SVG_NS, "text");
      var date = document.createElementNS(SVG_NS, "text");
      var title = document.createElementNS(SVG_NS, "title");

      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", "8");
      circle.setAttribute("fill", "#e9782e");
      circle.setAttribute("stroke", "#fff3dc");
      circle.setAttribute("stroke-width", "3");

      title.textContent =
        point.workout.title + ": " +
        point.value.toFixed(1) + "%, " +
        point.stats.made + "/" + point.stats.total;

      circle.appendChild(title);

      value.setAttribute("x", point.x);
      value.setAttribute("y", point.y - 16);
      value.setAttribute("fill", "#f4f1e9");
      value.setAttribute("font-weight", "700");
      value.setAttribute("text-anchor", "middle");
      value.textContent = point.value.toFixed(1) + "%";

      date.setAttribute("x", point.x);
      date.setAttribute("y", height - 25);
      date.setAttribute("fill", "#b8b4aa");
      date.setAttribute("font-size", "13");
      date.setAttribute("text-anchor", "middle");
      date.textContent = formatDate(point.workout.workoutDate);

      svg.append(circle, value, date);
    });

    if (points.length >= 2) {
      var difference =
        points[points.length - 1].value - points[0].value;

      elements["chart-trend"].textContent =
        (difference >= 0 ? "Рост +" : "Снижение ") +
        difference.toFixed(1) + " п.п.";
    } else {
      elements["chart-trend"].textContent =
        "Первая точка: " + points[0].value.toFixed(1) + "%";
    }
  }

  function renderAll() {
    renderWorkoutList();
    renderActiveWorkout();
    renderStatistics();
    renderShots();
    renderDrill();
    renderChart();
  }

  function handleCreateWorkout(event) {
    event.preventDefault();

    var mode = getSelectedWorkoutMode();
    var programType = elements["program-type"].value;
    var program = TRAINING_PROGRAMS[programType];
    var title = elements["workout-title"].value.trim();
    var date = elements["workout-date"].value;
    var notes = elements["workout-notes"].value.trim();

    if (mode === "guided" && program) {
      title = title || program.title;
      notes = notes || program.description;
    }

    if (!title || !date) {
      showMessage(
        elements["form-message"],
        "Заполните название и дату.",
        "error"
      );
      return;
    }

    var workout = {
      id: createId(),
      title: title,
      workoutDate: date,
      notes: notes,
      mode: mode,
      programType: mode === "guided" ? programType : null,
      createdAt: new Date().toISOString(),
      finishedAt: null
    };

    state.workouts.push(workout);
    state.activeWorkoutId = workout.id;
    state.activeDrillId = null;

    if (mode === "guided" && program) {
      var drill = {
        id: createId(),
        workoutId: workout.id,
        type: programType,
        name: DRILL_NAMES[programType],
        sets: program.sets,
        shotsPerSet: program.shotsPerSet,
        createdAt: new Date().toISOString(),
        finishedAt: null
      };

      state.drills.push(drill);
      state.activeDrillId = drill.id;
    }

    saveData();
    elements["workout-form"].reset();
    elements["workout-date"].value = getToday();
    updateProgramPreview(false);

    showMessage(
      elements["form-message"],
      mode === "guided"
        ? "Программа запущена — отмечайте броски на площадке."
        : "Свободная тренировка создана.",
      "success",
      10000
    );

    showToast(
      mode === "guided"
        ? "Готовая программа запущена"
        : "Свободная тренировка началась"
    );

    renderAll();
  }

  function handleCourtClick(event) {
    var workout = getActiveWorkout();

    if (!workout || workout.finishedAt) {
      showMessage(
        elements["court-message"],
        "Сначала выберите активную тренировку.",
        "error"
      );
      return;
    }

    var matrix = elements["basketball-court"].getScreenCTM();
    var point = elements["basketball-court"].createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    var svgPoint = point.matrixTransform(matrix.inverse());
    var x = Math.max(0, Math.min(1, svgPoint.x / 700));
    var y = Math.max(0, Math.min(1, svgPoint.y / 760));
    var activeDrill = getActiveDrill();

    var shot = {
      id: createId(),
      workoutId: workout.id,
      drillId: activeDrill && !activeDrill.finishedAt
        ? activeDrill.id
        : null,
      x: x,
      y: y,
      result: state.selectedResult,
      createdAt: new Date().toISOString()
    };

    state.shots.push(shot);

    if (activeDrill && !activeDrill.finishedAt) {
      var count = getDrillShots(activeDrill.id).length;
      var target = activeDrill.sets * activeDrill.shotsPerSet;

      if (count >= target) {
        activeDrill.finishedAt = new Date().toISOString();
      }
    }

    saveData();
    renderAll();

    showMessage(
      elements["court-message"],
      (shot.result === "made" ? "Попадание" : "Промах") +
      ": " + classifyShot(x, y).label,
      "success"
    );
  }

  function undoShot() {
    var workout = getActiveWorkout();
    var shots = getActiveShots();

    if (!workout || workout.finishedAt || !shots.length || undoTimer) {
      return;
    }

    var lastShot = shots[shots.length - 1];
    var marker = elements["shot-layer"].querySelector(
      '[data-shot-id="' + lastShot.id + '"]'
    );

    if (marker) {
      marker.classList.remove("is-new");
      marker.classList.add("is-removing");
    }

    undoTimer = window.setTimeout(function () {
      state.shots = state.shots.filter(function (shot) {
        return shot.id !== lastShot.id;
      });

      var drill = getActiveDrill();

      if (drill && getDrillShots(drill.id).length <
        drill.sets * drill.shotsPerSet) {
        drill.finishedAt = null;
      }

      undoTimer = null;
      saveData();
      renderAll();
    }, 180);
  }

  function openConfirmation(action) {
    state.confirmationAction = action;

    if (action === "finish") {
      elements["confirmation-icon"].textContent = "✓";
      elements["confirmation-title"].textContent =
        "Завершить тренировку?";
      elements["confirmation-text"].textContent =
        "После завершения новые броски добавить нельзя. Будет сформирован итоговый анализ.";
      elements["confirmation-accept"].textContent =
        "Завершить и показать анализ";
      elements["confirmation-accept"].className = "finish-button";
    } else if (action === "delete") {
      elements["confirmation-icon"].textContent = "!";
      elements["confirmation-title"].textContent =
        "Удалить тренировку?";
      elements["confirmation-text"].textContent =
        "Тренировка, упражнения и все броски будут удалены.";
      elements["confirmation-accept"].textContent = "Удалить";
      elements["confirmation-accept"].className = "danger-button";
    } else if (action === "import") {
      elements["confirmation-icon"].textContent = "⇩";
      elements["confirmation-title"].textContent =
        "Импортировать данные?";
      elements["confirmation-text"].textContent =
        "Текущие тренировки будут заменены содержимым выбранного файла.";
      elements["confirmation-accept"].textContent = "Импортировать";
      elements["confirmation-accept"].className = "finish-button";
    }

    elements["confirmation-dialog"].showModal();
  }

  function confirmAction() {
    var action = state.confirmationAction;
    var workout = getActiveWorkout();

    if (action === "finish" && workout) {
      workout.finishedAt = new Date().toISOString();

      var drill = getActiveDrill();

      if (drill && !drill.finishedAt) {
        drill.finishedAt = new Date().toISOString();
      }

      saveData();
      elements["confirmation-dialog"].close();
      renderAll();
      openAnalysis();
    }

    if (action === "delete" && workout) {
      state.workouts = state.workouts.filter(function (item) {
        return item.id !== workout.id;
      });

      state.shots = state.shots.filter(function (shot) {
        return shot.workoutId !== workout.id;
      });

      state.drills = state.drills.filter(function (drillItem) {
        return drillItem.workoutId !== workout.id;
      });

      state.activeWorkoutId = state.workouts.length
        ? state.workouts[state.workouts.length - 1].id
        : null;

      state.activeDrillId = null;

      saveData();
      elements["confirmation-dialog"].close();
      renderAll();
    }

    if (action === "import" && state.pendingImport) {
      state.workouts = state.pendingImport.workouts;
      state.shots = state.pendingImport.shots;
      state.drills = state.pendingImport.drills || [];
      state.activeWorkoutId = state.workouts.length
        ? state.workouts[0].id
        : null;
      state.activeDrillId = null;
      state.pendingImport = null;

      saveData();
      elements["confirmation-dialog"].close();
      renderAll();

      showMessage(
        elements["form-message"],
        "Данные успешно импортированы.",
        "success"
      );
    }

    state.confirmationAction = null;
  }

  function getRecommendation(zone) {
    var recommendations = {
      "left-close": "5 серий по 8 лэй-апов слева левой рукой.",
      "center-close": "Mikan Drill: 3 подхода по 20 бросков.",
      "right-close": "5 серий по 8 лэй-апов справа.",
      "left-mid": "30 бросков с левого локтя штрафной линии.",
      "center-mid": "10 серий по 5 штрафных бросков.",
      "right-mid": "30 бросков с правого локтя.",
      "left-three": "5×5 из левого угла и с левого крыла.",
      "center-three": "5×5 трёхочковых с вершины дуги.",
      "right-three": "5×5 из правого угла и с правого крыла."
    };

    return recommendations[zone.key];
  }

  function openAnalysis() {
    var workout = getActiveWorkout();
    var stats = getWorkoutStats(state.activeWorkoutId);

    if (!workout || !workout.finishedAt || !stats.total) {
      return;
    }

    var zones = stats.zones.slice().sort(function (a, b) {
      return a.percent - b.percent || a.made - b.made;
    });

    var weak = zones[0];
    var strong = zones[zones.length - 1];

    elements["analysis-grade"].textContent =
      stats.percent >= 60
        ? "Отличная точность"
        : stats.percent >= 45
          ? "Уверенная тренировка"
          : stats.percent >= 30
            ? "Есть потенциал"
            : "Нужна стабильность";

    elements["analysis-summary"].textContent =
      "Выполнено " + stats.total +
      " бросков, забито " + stats.made +
      ". Общая точность — " + stats.percent.toFixed(1) + "%.";

    elements["strong-zone-title"].textContent = strong.label;
    elements["strong-zone-text"].textContent =
      strong.made + " из " + strong.attempts +
      " — " + strong.percent.toFixed(1) + "%.";

    elements["weak-zone-title"].textContent = weak.label;
    elements["weak-zone-text"].textContent =
      weak.made + " из " + weak.attempts +
      " — " + weak.percent.toFixed(1) + "%.";

    var recommendations = [
      getRecommendation(weak),
      "Закрепите сильную зону: 3 серии по 5 бросков.",
      "Добавьте упражнение «Пять точек» для равномерной нагрузки."
    ];

    elements["recommendation-list"].innerHTML = "";

    recommendations.forEach(function (text) {
      var item = document.createElement("li");

      item.textContent = text;
      elements["recommendation-list"].appendChild(item);
    });

    elements["analysis-dialog"].showModal();
  }

  function exportData() {
    var data = {
      application: "Basketball Shot Chart",
      version: 5,
      exportedAt: new Date().toISOString(),
      workouts: state.workouts,
      shots: state.shots,
      drills: state.drills
    };

    var blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = "basketball-shot-chart-" + getToday() + ".json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importData(file) {
    var reader = new FileReader();

    reader.addEventListener("load", function () {
      try {
        var data = JSON.parse(reader.result);

        if (!Array.isArray(data.workouts) ||
            !Array.isArray(data.shots)) {
          throw new Error("Некорректный формат");
        }

        state.pendingImport = {
          workouts: data.workouts,
          shots: data.shots,
          drills: Array.isArray(data.drills) ? data.drills : []
        };

        openConfirmation("import");
      } catch (error) {
        showMessage(
          elements["form-message"],
          "Не удалось импортировать файл.",
          "error"
        );
      }
    });

    reader.readAsText(file);
  }

  function openComparison() {
    var completed = state.workouts.filter(function (workout) {
      return workout.finishedAt && getWorkoutStats(workout.id).total;
    });

    if (completed.length < 2) {
      showMessage(
        elements["form-message"],
        "Для сравнения нужны две завершённые тренировки.",
        "error"
      );
      return;
    }

    ["compare-first", "compare-second"].forEach(function (id) {
      elements[id].innerHTML = "";

      completed.forEach(function (workout) {
        var option = document.createElement("option");

        option.value = workout.id;
        option.textContent =
          workout.title + " — " + formatDate(workout.workoutDate);

        elements[id].appendChild(option);
      });
    });

    elements["compare-second"].selectedIndex = 1;
    elements["comparison-result"].hidden = true;
    elements["compare-message"].textContent = "";
    elements["compare-dialog"].showModal();
  }

  function runComparison() {
    var firstId = elements["compare-first"].value;
    var secondId = elements["compare-second"].value;

    if (firstId === secondId) {
      showMessage(
        elements["compare-message"],
        "Выберите разные тренировки.",
        "error"
      );
      return;
    }

    var first = getWorkout(firstId);
    var second = getWorkout(secondId);
    var firstStats = getWorkoutStats(firstId);
    var secondStats = getWorkoutStats(secondId);
    var difference = secondStats.percent - firstStats.percent;
    var differenceClass = Math.abs(difference) < 2
      ? ""
      : difference > 0 ? "positive" : "negative";
    var differenceMark = difference > 0 ? "▲ " : difference < 0 ? "▼ " : "";

    var result = elements["comparison-result"];

    result.hidden = false;
    result.innerHTML =
      '<div class="comparison-cards">' +
        createComparisonCard(first, firstStats) +
        createComparisonCard(second, secondStats) +
      "</div>" +
      '<table class="comparison-table">' +
        "<thead><tr><th>Показатель</th><th>Изменение</th></tr></thead>" +
        "<tbody>" +
          "<tr><td>Точность</td><td class=\"" +
          differenceClass + "\">" + differenceMark +
          (difference > 0 ? "+" : "") + difference.toFixed(1) +
          " п.п.</td></tr>" +
          "<tr><td>Количество бросков</td><td>" +
          (secondStats.total - firstStats.total) + "</td></tr>" +
          "<tr><td>Попадания</td><td>" +
          (secondStats.made - firstStats.made) + "</td></tr>" +
        "</tbody>" +
      "</table>";

    showMessage(
      elements["compare-message"],
      difference > 0
        ? "Точность выросла."
        : difference < 0
          ? "Точность снизилась."
          : "Точность не изменилась.",
      difference >= 0 ? "success" : "error"
    );
  }

  function createComparisonCard(workout, stats) {
    return (
      '<article class="comparison-card">' +
        "<h3>" + escapeHtml(workout.title) + "</h3>" +
        "<p>" + formatDate(workout.workoutDate) + "</p>" +
        "<strong>" + stats.percent.toFixed(1) + "% FG</strong>" +
        "<p>" + stats.made + " из " + stats.total + "</p>" +
      "</article>"
    );
  }

  function escapeHtml(value) {
    var element = document.createElement("div");

    element.textContent = value;
    return element.innerHTML;
  }

  function selectShotResult(result) {
    state.selectedResult = result;

    elements.resultButtons.forEach(function (button) {
      button.classList.toggle("active", button.dataset.result === result);
    });
  }

  function handleCourtPointerMove(event) {
    var zoneElement = event.target.closest(".heat-zone");

    if (!zoneElement) {
      elements["court-tooltip"].hidden = true;
      return;
    }

    var zone = getWorkoutStats(state.activeWorkoutId).zones.find(
      function (item) {
        return item.key === zoneElement.dataset.zone;
      }
    );
    var label = zone
      ? zone.label + " · " + zone.made + "/" + zone.attempts +
        " · " + zone.percent.toFixed(1) + "%"
      : zoneElement.getAttribute("aria-label");
    var wrapper = elements["basketball-court"].parentElement;
    var bounds = wrapper.getBoundingClientRect();

    elements["court-tooltip"].textContent = label;
    elements["court-tooltip"].style.left =
      Math.max(
        8,
        Math.min(event.clientX - bounds.left + 12, bounds.width - 220)
      ) + "px";
    elements["court-tooltip"].style.top =
      Math.max(8, event.clientY - bounds.top + 12) + "px";
    elements["court-tooltip"].hidden = false;
  }

  function connectEvents() {
    elements["workout-form"].addEventListener("submit", handleCreateWorkout);
    elements.modeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        updateProgramPreview(true);
      });
    });
    elements["program-type"].addEventListener("change", function () {
      updateProgramPreview(true);
    });
    elements["basketball-court"].addEventListener("click", handleCourtClick);
    elements["basketball-court"].addEventListener(
      "pointermove",
      handleCourtPointerMove
    );
    elements["basketball-court"].addEventListener("pointerleave", function () {
      elements["court-tooltip"].hidden = true;
    });
    elements["undo-shot-button"].addEventListener("click", undoShot);

    elements["finish-workout-button"].addEventListener("click", function () {
      var workout = getActiveWorkout();

      if (workout && workout.finishedAt) {
        openAnalysis();
      } else {
        openConfirmation("finish");
      }
    });

    elements["delete-workout-button"].addEventListener("click", function () {
      openConfirmation("delete");
    });

    elements["confirmation-cancel"].addEventListener("click", function () {
      state.confirmationAction = null;
      state.pendingImport = null;
      elements["confirmation-dialog"].close();
    });

    elements["confirmation-accept"].addEventListener("click", confirmAction);
    elements["analysis-close"].addEventListener("click", function () {
      elements["analysis-dialog"].close();
    });

    elements["compare-close"].addEventListener("click", function () {
      elements["compare-dialog"].close();
    });

    elements["run-comparison"].addEventListener("click", runComparison);
    elements["compare-button"].addEventListener("click", openComparison);
    elements["export-button"].addEventListener("click", exportData);

    elements["import-button"].addEventListener("click", function () {
      elements["import-file"].click();
    });

    elements["import-file"].addEventListener("change", function () {
      if (this.files[0]) {
        importData(this.files[0]);
      }

      this.value = "";
    });

    elements.resultButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectShotResult(button.dataset.result);
      });
    });

    document.addEventListener("keydown", function (event) {
      var tagName = event.target.tagName;

      if (tagName === "INPUT" || tagName === "TEXTAREA" ||
        tagName === "SELECT" || document.querySelector("dialog[open]")) {
        return;
      }

      if (event.code === "KeyH") {
        selectShotResult("made");
      } else if (event.code === "KeyM") {
        selectShotResult("missed");
      } else if (event.code === "KeyZ") {
        undoShot();
      } else {
        return;
      }

      event.preventDefault();
    });
  }

  function initialize() {
    findElements();
    loadData();

    elements["workout-date"].value = getToday();
    updateProgramPreview(false);

    if (!getWorkout(state.activeWorkoutId) && state.workouts.length) {
      state.activeWorkoutId =
        state.workouts[state.workouts.length - 1].id;
    }

    connectEvents();
    saveData();
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", initialize);
}());
