'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  markerId;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${
      this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
    } ${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }

  set markerId(id) {
    this.markerId = id;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run1 = new Running([39, -12], 5.7, 20, 170);
const cycling1 = new Cycling([32, -15], 34, 44, 30);

////////////////////// -- APP -- //////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const formCancel = document.querySelector('.form__btn--cancel');

class App {
  #map;
  #mapZoomLevel = 13;
  #markers = [];
  #pendingMark;
  #workouts = [];

  constructor() {
    // Get users position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    // Event handlers binded to allow use for 'this'
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    formCancel.addEventListener(
      'click',
      this._cancelWorkoutCreation.bind(this)
    );
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
    document.addEventListener('click', this._deleteWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: 'mapty',
    }).addTo(this.#map);

    //   Handling clicks on map
    this.#map.on('click', this._mapClick.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }

  _mapClick(mapEvent) {
    const { lat, lng } = mapEvent.latlng;
    if (!this.#pendingMark) {
      this.#pendingMark = L.marker([lat, lng], { draggable: true })
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: 'workout-popup',
          })
        )
        .setPopupContent('Pin your workout! <br>(Drag marker to move)')
        .openPopup();
    } else this.#pendingMark.openPopup();

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _removePendingMarker() {
    if (!this.#pendingMark) return;
    this.#map.removeLayer(this.#pendingMark);
    this.#pendingMark = null;
  }

  _cancelWorkoutCreation() {
    this._removePendingMarker();
    this._hideForm();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _renderWorkoutMarker(workout) {
    this._removePendingMarker();

    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
    this.#markers.push(marker);
    workout.markerId = marker._leaflet_id;
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button type="button" class="workout--delete">DELETE WORKOUT</button>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;
    form.insertAdjacentHTML('afterend', html);
  }

  _newWorkout(e) {
    e.preventDefault();
    // Check if data is valid by recieving all the inputs and if one of the data pieces isnt valid it will return false
    // Checks if its a finite number
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));

    // Checks if all inputs that need to be positive are positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // End of checks

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    // Get pending marker lat lng
    const { lat, lng } = this.#pendingMark.getLatLng();

    // Create object if type is running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input have to be positive numbers');

      // Create new workout class
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // Create object if type is cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input have to be positive numbers');

      // Create new workout class
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this._renderWorkoutMarker(workout);

    // Create popup

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear inputs
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    const mark = this.#markers.find(
      mark => mark._leaflet_id === workout.markerId
    );
    // Open marker popup
    mark.openPopup();

    // Pan to marker
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
  }

  _deleteWorkout(e) {
    // Guard clause
    if (e.target.classList[0] !== 'workout--delete') return;

    // Workout element selected
    const workoutEl = e.target.closest('.workout');

    // Finding workout
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Finding marker
    const mark = this.#markers.find(
      mark => mark._leaflet_id === workout.markerId
    );

    // Setting workouts to the updated workout list
    this.#workouts = this.#workouts.filter(work => work.id !== workout.id);

    // Updating local storage
    this._setLocalStorage();

    // Update UI
    workoutEl.remove();

    // Remove marker
    this.#map.removeLayer(mark);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

// Create and run application upon start.
const app = new App();
