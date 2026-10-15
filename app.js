(function () {
  "use strict";

  var STORAGE_KEY = "basketball-shot-chart-v4";
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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
    activeWorkoutId: null,
    selectedResult: "made",
    confirmationAction: null
  };

  var elements = {};

  function findElements() {
    elements.form = document.getElementById("workout-form");
    elements.titleInput = document.getElementById("workout-title");
    elements.dateInput = document.getElementById("workout-date");
    elements.notesInput = document.getElementById("workout-notes");
    elements.formMessage = document.getElementById("form-message");

    elements.workoutList = document.getElementById("workout-list");
    elements.workoutCount = document.getElementById("workout-count");

    elements.currentTitle = document.getElementById("current-title");
    elements.currentMeta = document.getElementById("current-meta");

    elements.finishButton = document.getElementById(
      "finish-workout-button"
    );

    elements.deleteButton = document.getElementById(
      "delete-workout-button"
    );

    elements.undoButton = document.getElementById(
      "undo-shot-button"
    );

    elements.court = document.getElementById("basketball-court");
    elements.courtLock = document.getElementById("court-lock");
    elements.courtMessage = document.getElementById("court-message");
    elements.shotLayer = document.getElementById("shot-layer");

    elements.resultButtons = document.querySelectorAll(
      ".result-button"
    );

    elements.totalShots = document.getElementById("total-shots");
    elements.madeShots = document.getElementById("made-shots");
    elements.missedShots = document.getElementById("missed-shots");

    elements.fieldGoalPercent = document.getElementById(
      "field-goal-percent"
    );

    elements.zoneStats = document.getElementById("zone-stats");

    elements.allTotalShots = document.getElementById(
      "all-total-shots"
    );

    elements.allMadeShots = document.getElementById(
      "all-made-shots"
    );

    elements.allFieldGoalPercent = document.getElementById(
      "all-field-goal-percent"
    );

    elements.confirmationDialog = document.getElementById(
      "confirmation-dialog"
    );

    elements.confirmationIcon = document.getElementById(
      "confirmation-icon"
    );

    elements.confirmationTitle = document.getElementById(
      "confirmation-title"
    );

    elements.confirmationText = document.getElementById(
      "confirmation-text"
    );

    elements.confirmationCancel = document.getElementById(
      "confirmation-cancel"
    );

    elements.confirmationAccept = document.getElementById(
      "confirmation-accept"
    );

    elements.analysisDialog = document.getElementById(
      "analysis-dialog"
    );

    elements.analysisClose = document.getElementById(
      "analysis-close"
    );

    elements.analysisCloseFooter = document.getElementById(
      "analysis-close-footer"
    );

    elements.analysisGrade = document.getElementById(
      "analysis-grade"
    );

    elements.analysisSummary = document.getElementById(
      "analysis-summary"
    );

    elements.strongZoneTitle = document.getElementById(
      "strong-zone-title"
    );

    elements.strongZoneText = document.getElementById(
      "strong-zone-text"
    );

    elements.weakZoneTitle = document.getElementById(
      "weak-zone-title"
    );

    elements.weakZoneText = document.getElementById(
      "weak-zone-text"
    );

    elements.recommendationList = document.getElementById(
      "recommendation-list"
    );
  }

  function createId() {
    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).substring(2, 10)
    );
  }

  function getToday() {
    var date = new Date();
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    var parts = value.split("-");

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(
      new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      )
    );
  }

  function calculatePercent(made, attempts) {
    if (attempts === 0) {
      return 0;
    }

    return made / attempts * 100;
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = "message" + (type ? " " + type : "");
  }

  function loadData() {
    var savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return;
    }

    try {
      var parsedData = JSON.parse(savedData);

      state.workouts = Array.isArray(parsedData.workouts)
        ? parsedData.workouts
        : [];

      state.shots = Array.isArray(parsedData.shots)
        ? parsedData.shots
        : [];

      state.activeWorkoutId =
        typeof parsedData.activeWorkoutId === "string"
          ? parsedData.activeWorkoutId
          : null;
    } catch (error) {
      console.error("Ошибка чтения localStorage:", error);

      state.workouts = [];
      state.shots = [];
      state.activeWorkoutId = null;
    }
  }

  function saveData() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        workouts: state.workouts,
        shots: state.shots,
        activeWorkoutId: state.activeWorkoutId
      })
    );
  }

  function getActiveWorkout() {
    var index;

    for (index = 0; index < state.workouts.length; index += 1) {
      if (state.workouts[index].id === state.activeWorkoutId) {
        return state.workouts[index];
      }
    }

    return null;
  }

  function getWorkoutShots(workoutId) {
    return state.shots.filter(function (shot) {
      return shot.workoutId === workoutId;
    });
  }

  function getActiveShots() {
    return getWorkoutShots(state.activeWorkoutId);
  }

  function classifyShot(x, y) {
    var basketX = 0.5;
    var basketY = 0.12;

    var distance = Math.sqrt(
      Math.pow(x - basketX, 2) +
      Math.pow(y - basketY, 2)
    );

    var side = "center";

    if (x < 0.37) {
      side = "left";
    } else if (x > 0.63) {
      side = "right";
    }

    var cornerThree =
      y < 0.35 && (x <= 0.13 || x >= 0.87);

    var range = "mid";

    if (cornerThree || distance >= 0.43) {
      range = "three";
    } else if (distance <= 0.17) {
      range = "close";
    }

    return {
      side: side,
      range: range,
      key: side + "-" + range,
      label:
        SIDE_LABELS[side] +
        " · " +
        RANGE_LABELS[range]
    };
  }

  function getZoneStatistics(shots) {
    var zoneMap = {};

    shots.forEach(function (shot) {
      var zone = classifyShot(shot.x, shot.y);

      if (!zoneMap[zone.key]) {
        zoneMap[zone.key] = {
          key: zone.key,
          label: zone.label,
          side: zone.side,
          range: zone.range,
          attempts: 0,
          made: 0
        };
      }

      zoneMap[zone.key].attempts += 1;

      if (shot.result === "made") {
        zoneMap[zone.key].made += 1;
      }
    });

    return Object.keys(zoneMap).map(function (key) {
      var zone = zoneMap[key];

      zone.missed = zone.attempts - zone.made;
      zone.percent = calculatePercent(
        zone.made,
        zone.attempts
      );

      return zone;
    });
  }

  function createEmptyMessage(text) {
    var paragraph = document.createElement("p");

    paragraph.className = "empty-state";
    paragraph.textContent = text;

    return paragraph;
  }

  function renderWorkoutList() {
    elements.workoutList.innerHTML = "";
    elements.workoutCount.textContent = state.workouts.length;

    if (state.workouts.length === 0) {
      elements.workoutList.appendChild(
        createEmptyMessage("Тренировок пока нет.")
      );

      return;
    }

    var sortedWorkouts = state.workouts.slice();

    sortedWorkouts.sort(function (first, second) {
      if (first.workoutDate !== second.workoutDate) {
        return second.workoutDate.localeCompare(
          first.workoutDate
        );
      }

      return second.createdAt.localeCompare(
        first.createdAt
      );
    });

    sortedWorkouts.forEach(function (workout) {
      var shots = getWorkoutShots(workout.id);

      var made = shots.filter(function (shot) {
        return shot.result === "made";
      }).length;

      var button = document.createElement("button");
      var title = document.createElement("strong");
      var meta = document.createElement("span");

      button.type = "button";
      button.className = "workout-item";

      if (workout.id === state.activeWorkoutId) {
        button.classList.add("active");
      }

      title.textContent = workout.title;

      meta.textContent =
        formatDate(workout.workoutDate) +
        " · " +
        shots.length +
        " бросков · " +
        calculatePercent(made, shots.length).toFixed(1) +
        "% · " +
        (workout.finishedAt ? "завершена" : "активна");

      if (workout.finishedAt) {
        meta.classList.add("finished");
      }

      button.appendChild(title);
      button.appendChild(meta);

      button.addEventListener("click", function () {
        state.activeWorkoutId = workout.id;
        saveData();
        renderAll();
      });

      elements.workoutList.appendChild(button);
    });
  }

  function renderActiveWorkout() {
    var workout = getActiveWorkout();
    var shots = getActiveShots();

    if (!workout) {
      elements.currentTitle.textContent =
        "Выберите тренировку";

      elements.currentMeta.textContent =
        "Создайте тренировку или откройте её из истории.";

      elements.finishButton.disabled = true;
      elements.deleteButton.disabled = true;
      elements.undoButton.disabled = true;
      elements.courtLock.hidden = true;

      elements.resultButtons.forEach(function (button) {
        button.disabled = false;
      });

      return;
    }

    elements.currentTitle.textContent = workout.title;

    var details = [formatDate(workout.workoutDate)];

    if (workout.notes) {
      details.push(workout.notes);
    }

    details.push(
      workout.finishedAt
        ? "Тренировка завершена"
        : "Тренировка активна"
    );

    elements.currentMeta.textContent = details.join(" · ");
    elements.deleteButton.disabled = false;

    if (workout.finishedAt) {
      elements.finishButton.disabled = false;
      elements.finishButton.textContent = "Показать анализ";
    } else {
      elements.finishButton.disabled = shots.length === 0;

      elements.finishButton.textContent =
        "Завершить тренировку";
    }

    elements.undoButton.disabled =
      Boolean(workout.finishedAt) ||
      shots.length === 0;

    elements.courtLock.hidden = !workout.finishedAt;

    elements.resultButtons.forEach(function (button) {
      button.disabled = Boolean(workout.finishedAt);
    });
  }

  function renderWorkoutStatistics() {
    var shots = getActiveShots();

    var made = shots.filter(function (shot) {
      return shot.result === "made";
    }).length;

    elements.totalShots.textContent = shots.length;
    elements.madeShots.textContent = made;
    elements.missedShots.textContent = shots.length - made;

    elements.fieldGoalPercent.textContent =
      calculatePercent(made, shots.length).toFixed(1) +
      "%";

    renderZoneStatistics(shots);
  }

  function renderZoneStatistics(shots) {
    elements.zoneStats.innerHTML = "";

    if (shots.length === 0) {
      elements.zoneStats.appendChild(
        createEmptyMessage(
          "Сделайте первый бросок, чтобы увидеть статистику."
        )
      );

      return;
    }

    var zones = getZoneStatistics(shots);

    zones.sort(function (first, second) {
      return second.attempts - first.attempts;
    });

    zones.forEach(function (zone) {
      var row = document.createElement("div");
      var name = document.createElement("span");
      var value = document.createElement("strong");
      var track = document.createElement("div");
      var fill = document.createElement("div");

      row.className = "zone-row";
      track.className = "progress-track";
      fill.className = "progress-fill";

      name.textContent =
        zone.label +
        " · " +
        zone.made +
        "/" +
        zone.attempts;

      value.textContent = zone.percent.toFixed(1) + "%";
      fill.style.width = zone.percent + "%";

      track.appendChild(fill);
      row.appendChild(name);
      row.appendChild(value);
      row.appendChild(track);

      elements.zoneStats.appendChild(row);
    });
  }

  function renderOverallStatistics() {
    var made = state.shots.filter(function (shot) {
      return shot.result === "made";
    }).length;

    elements.allTotalShots.textContent =
      state.shots.length;

    elements.allMadeShots.textContent = made;

    elements.allFieldGoalPercent.textContent =
      calculatePercent(
        made,
        state.shots.length
      ).toFixed(1) + "%";
  }

  function createShotMarker(shot) {
    var group = document.createElementNS(
      SVG_NAMESPACE,
      "g"
    );

    var x = shot.x * 700;
    var y = shot.y * 760;

    group.setAttribute("pointer-events", "none");

    if (shot.result === "made") {
      var outer = document.createElementNS(
        SVG_NAMESPACE,
        "circle"
      );

      var inner = document.createElementNS(
        SVG_NAMESPACE,
        "circle"
      );

      outer.setAttribute("cx", x);
      outer.setAttribute("cy", y);
      outer.setAttribute("r", "11");
      outer.setAttribute("fill", "#38bdf8");
      outer.setAttribute("stroke", "#e0f2fe");
      outer.setAttribute("stroke-width", "4");
      outer.setAttribute("filter", "url(#made-glow)");

      inner.setAttribute("cx", x);
      inner.setAttribute("cy", y);
      inner.setAttribute("r", "3");
      inner.setAttribute("fill", "#071329");

      group.appendChild(outer);
      group.appendChild(inner);
    } else {
      var firstLine = document.createElementNS(
        SVG_NAMESPACE,
        "line"
      );

      var secondLine = document.createElementNS(
        SVG_NAMESPACE,
        "line"
      );

      firstLine.setAttribute("x1", x - 10);
      firstLine.setAttribute("y1", y - 10);
      firstLine.setAttribute("x2", x + 10);
      firstLine.setAttribute("y2", y + 10);

      secondLine.setAttribute("x1", x + 10);
      secondLine.setAttribute("y1", y - 10);
      secondLine.setAttribute("x2", x - 10);
      secondLine.setAttribute("y2", y + 10);

      [firstLine, secondLine].forEach(function (line) {
        line.setAttribute("stroke", "#fb7185");
        line.setAttribute("stroke-width", "7");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("filter", "url(#miss-glow)");

        group.appendChild(line);
      });
    }

    return group;
  }

  function renderShots() {
    elements.shotLayer.innerHTML = "";

    getActiveShots().forEach(function (shot) {
      elements.shotLayer.appendChild(
        createShotMarker(shot)
      );
    });
  }

  function getGrade(value) {
    if (value >= 60) {
      return "Отличная точность";
    }

    if (value >= 45) {
      return "Уверенная тренировка";
    }

    if (value >= 30) {
      return "Есть потенциал";
    }

    return "Нужна стабильность";
  }

  function getRecommendation(zone) {
    var recommendations = {
      "left-close":
        "Выполни 5 серий по 8 лэй-апов слева левой рукой. Целься в верхний угол квадрата на щите.",

      "center-close":
        "Выполни Mikan Drill: 3 подхода по 20 бросков попеременно справа и слева от кольца.",

      "right-close":
        "Выполни 5 серий по 8 лэй-апов справа. Следи за последним шагом и мягким касанием щита.",

      "left-mid":
        "Сделай 30 бросков с левого локтя штрафной линии и 20 бросков после одного ведения влево.",

      "center-mid":
        "Сделай 10 серий по 5 штрафных бросков. Записывай результат после каждой серии.",

      "right-mid":
        "Сделай 30 бросков с правого локтя и 20 бросков после остановки в два шага справа.",

      "left-three":
        "Сделай по 5 серий из 5 бросков из левого угла и с левого крыла.",

      "center-three":
        "Сделай 5 серий по 5 трёхочковых с вершины дуги, сохраняя одинаковую технику.",

      "right-three":
        "Сделай по 5 серий из 5 бросков из правого угла и с правого крыла."
    };

    return recommendations[zone.key];
  }

  function fillAnalysis() {
    var workout = getActiveWorkout();
    var shots = getActiveShots();

    if (!workout || !workout.finishedAt || shots.length === 0) {
      return false;
    }

    var zones = getZoneStatistics(shots);

    zones.sort(function (first, second) {
      if (first.percent !== second.percent) {
        return first.percent - second.percent;
      }

      if (first.made !== second.made) {
        return first.made - second.made;
      }

      return second.attempts - first.attempts;
    });

    var weakZone = zones[0];
    var strongZone = zones[zones.length - 1];

    var made = shots.filter(function (shot) {
      return shot.result === "made";
    }).length;

    var overall = calculatePercent(
      made,
      shots.length
    );

    elements.analysisGrade.textContent =
      getGrade(overall);

    elements.analysisSummary.textContent =
      "За тренировку выполнено " +
      shots.length +
      " бросков, забито " +
      made +
      ". Общая точность — " +
      overall.toFixed(1) +
      "%. Анализ учитывает сторону площадки и дистанцию.";

    elements.strongZoneTitle.textContent =
      strongZone.label;

    elements.strongZoneText.textContent =
      strongZone.made +
      " из " +
      strongZone.attempts +
      " — " +
      strongZone.percent.toFixed(1) +
      "%. Это самая уверенная зона этой тренировки.";

    elements.weakZoneTitle.textContent =
      weakZone.label;

    elements.weakZoneText.textContent =
      weakZone.made +
      " из " +
      weakZone.attempts +
      " — " +
      weakZone.percent.toFixed(1) +
      "%. Этой зоне стоит уделить больше внимания.";

    var recommendations = [
      getRecommendation(weakZone),

      "Закрепи сильную зону: сделай из неё 3 серии по 5 бросков в игровом темпе.",

      "Заверши следующую тренировку серией из пяти точек: левый угол, левое крыло, центр, правое крыло и правый угол."
    ];

    elements.recommendationList.innerHTML = "";

    recommendations.forEach(function (text) {
      var item = document.createElement("li");

      item.textContent = text;
      elements.recommendationList.appendChild(item);
    });

    return true;
  }

  function openAnalysis() {
    if (!fillAnalysis()) {
      return;
    }

    if (!elements.analysisDialog.open) {
      elements.analysisDialog.showModal();
    }
  }

  function renderAll() {
    renderWorkoutList();
    renderActiveWorkout();
    renderWorkoutStatistics();
    renderOverallStatistics();
    renderShots();
  }

  function handleCreateWorkout(event) {
    event.preventDefault();

    var title = elements.titleInput.value.trim();
    var workoutDate = elements.dateInput.value;
    var notes = elements.notesInput.value.trim();

    if (!title || !workoutDate) {
      showMessage(
        elements.formMessage,
        "Заполните название и дату тренировки.",
        "error"
      );

      return;
    }

    var workout = {
      id: createId(),
      title: title,
      workoutDate: workoutDate,
      notes: notes,
      createdAt: new Date().toISOString(),
      finishedAt: null
    };

    state.workouts.push(workout);
    state.activeWorkoutId = workout.id;

    saveData();

    elements.form.reset();
    elements.dateInput.value = getToday();

    showMessage(
      elements.formMessage,
      "Тренировка создана.",
      "success"
    );

    showMessage(elements.courtMessage, "", "");
    renderAll();
  }

  function handleCourtClick(event) {
    var workout = getActiveWorkout();

    if (!workout) {
      showMessage(
        elements.courtMessage,
        "Сначала создайте тренировку.",
        "error"
      );

      return;
    }

    if (workout.finishedAt) {
      return;
    }

    var matrix = elements.court.getScreenCTM();

    if (!matrix) {
      return;
    }

    var point = elements.court.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    var svgPoint = point.matrixTransform(
      matrix.inverse()
    );

    var x = Math.max(
      0,
      Math.min(1, svgPoint.x / 700)
    );

    var y = Math.max(
      0,
      Math.min(1, svgPoint.y / 760)
    );

    var zone = classifyShot(x, y);

    state.shots.push({
      id: createId(),
      workoutId: workout.id,
      x: x,
      y: y,
      result: state.selectedResult,
      createdAt: new Date().toISOString()
    });

    saveData();
    renderAll();

    showMessage(
      elements.courtMessage,
      (state.selectedResult === "made"
        ? "Попадание: "
        : "Промах: ") + zone.label,
      "success"
    );
  }

  function handleUndo() {
    var workout = getActiveWorkout();
    var shots = getActiveShots();

    if (
      !workout ||
      workout.finishedAt ||
      shots.length === 0
    ) {
      return;
    }

    var lastShot = shots[shots.length - 1];

    state.shots = state.shots.filter(function (shot) {
      return shot.id !== lastShot.id;
    });

    saveData();
    renderAll();

    showMessage(
      elements.courtMessage,
      "Последний бросок удалён.",
      "success"
    );
  }

  function openFinishConfirmation() {
    state.confirmationAction = "finish";

    elements.confirmationIcon.textContent = "✓";
    elements.confirmationTitle.textContent =
      "Завершить тренировку?";

    elements.confirmationText.textContent =
      "После завершения добавлять и удалять броски будет нельзя. Приложение сформирует анализ сильных и слабых зон.";

    elements.confirmationAccept.textContent =
      "Завершить и показать анализ";

    elements.confirmationAccept.className =
      "finish-button";

    elements.confirmationDialog.showModal();
  }

  function openDeleteConfirmation() {
    var workout = getActiveWorkout();

    if (!workout) {
      return;
    }

    state.confirmationAction = "delete";

    elements.confirmationIcon.textContent = "!";
    elements.confirmationTitle.textContent =
      "Удалить тренировку?";

    elements.confirmationText.textContent =
      "Тренировка «" +
      workout.title +
      "» и все её броски будут удалены без возможности восстановления.";

    elements.confirmationAccept.textContent =
      "Удалить тренировку";

    elements.confirmationAccept.className =
      "danger-button";

    elements.confirmationDialog.showModal();
  }

  function confirmCurrentAction() {
    if (state.confirmationAction === "finish") {
      finishWorkout();
    } else if (state.confirmationAction === "delete") {
      deleteWorkout();
    }

    state.confirmationAction = null;
  }

  function finishWorkout() {
    var workout = getActiveWorkout();

    if (!workout || workout.finishedAt) {
      elements.confirmationDialog.close();
      return;
    }

    workout.finishedAt = new Date().toISOString();

    saveData();
    elements.confirmationDialog.close();
    renderAll();

    showMessage(
      elements.courtMessage,
      "Тренировка завершена. Анализ готов.",
      "success"
    );

    openAnalysis();
  }

  function deleteWorkout() {
    var workout = getActiveWorkout();

    if (!workout) {
      elements.confirmationDialog.close();
      return;
    }

    state.workouts = state.workouts.filter(
      function (item) {
        return item.id !== workout.id;
      }
    );

    state.shots = state.shots.filter(
      function (shot) {
        return shot.workoutId !== workout.id;
      }
    );

    state.activeWorkoutId =
      state.workouts.length > 0
        ? state.workouts[state.workouts.length - 1].id
        : null;

    saveData();
    elements.confirmationDialog.close();
    renderAll();

    showMessage(
      elements.courtMessage,
      "Тренировка удалена.",
      "success"
    );
  }

  function handleFinishButton() {
    var workout = getActiveWorkout();
    var shots = getActiveShots();

    if (!workout) {
      return;
    }

    if (workout.finishedAt) {
      openAnalysis();
      return;
    }

    if (shots.length === 0) {
      showMessage(
        elements.courtMessage,
        "Сначала отметьте хотя бы один бросок.",
        "error"
      );

      return;
    }

    openFinishConfirmation();
  }

  function closeConfirmation() {
    state.confirmationAction = null;
    elements.confirmationDialog.close();
  }

  function closeAnalysis() {
    elements.analysisDialog.close();
  }

  function connectEvents() {
    elements.form.addEventListener(
      "submit",
      handleCreateWorkout
    );

    elements.court.addEventListener(
      "click",
      handleCourtClick
    );

    elements.undoButton.addEventListener(
      "click",
      handleUndo
    );

    elements.finishButton.addEventListener(
      "click",
      handleFinishButton
    );

    elements.deleteButton.addEventListener(
      "click",
      openDeleteConfirmation
    );

    elements.confirmationCancel.addEventListener(
      "click",
      closeConfirmation
    );

    elements.confirmationAccept.addEventListener(
      "click",
      confirmCurrentAction
    );

    elements.analysisClose.addEventListener(
      "click",
      closeAnalysis
    );

    elements.analysisCloseFooter.addEventListener(
      "click",
      closeAnalysis
    );

    elements.confirmationDialog.addEventListener(
      "click",
      function (event) {
        if (event.target === elements.confirmationDialog) {
          closeConfirmation();
        }
      }
    );

    elements.analysisDialog.addEventListener(
      "click",
      function (event) {
        if (event.target === elements.analysisDialog) {
          closeAnalysis();
        }
      }
    );

    elements.resultButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedResult =
          button.getAttribute("data-result");

        elements.resultButtons.forEach(
          function (currentButton) {
            currentButton.classList.toggle(
              "active",
              currentButton === button
            );
          }
        );
      });
    });
  }

  function initialize() {
    findElements();
    loadData();

    elements.dateInput.value = getToday();

    var activeWorkoutExists = state.workouts.some(
      function (workout) {
        return workout.id === state.activeWorkoutId;
      }
    );

    if (
      !activeWorkoutExists &&
      state.workouts.length > 0
    ) {
      state.activeWorkoutId =
        state.workouts[state.workouts.length - 1].id;
    }

    connectEvents();
    saveData();
    renderAll();
  }

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );
}());