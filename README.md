# Matrix Lab — Streamlit demonstration

Shareable adaptation of the original matrix-task prototype. These are original demonstration puzzles, not MaRs-IB or Raven's items. The three difficulty levels and six-item practice selection rule are provisional, not calibrated. Optional Bluetooth heart-rate recording is included. Money exchange is not included.

## Publish on Streamlit

1. Create a GitHub repository, for example `matrix-task-prototype`.
2. Upload the contents of this folder to its root. Upload the files, not the ZIP. Include `streamlit_app.py`, `requirements.txt`, `index.html`, `engine.js`, `hr.js`, and `app.js`.
3. At https://share.streamlit.io choose **Create app**, then **Yup, I have an app**.
4. Select your repository, branch `main`, and main file `streamlit_app.py`. Use Python 3.12 in Advanced settings.
5. Deploy, then share the resulting app link with your student.

Official instructions: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy

## Run on your own computer

From this folder:

```sh
python3 -m pip install -r requirements.txt
python3 -m streamlit run streamlit_app.py
```

## Procedure

- Adjustable doubling, additive, or custom progressive ratio schedule.
- One point per completed ratio; only correct first submissions advance progress. Errors preserve progress.
- Six practice items followed by a fixed demo difficulty for the visit, with researcher override.
- A break ends the session. Restart resets the ratio to 1 while retaining points.
- Voluntary breaks, partial progress, response times, and 30/60-minute visit limits are recorded.
- Researcher results offer complete JSON and trial, session, and break CSV downloads.

## Data behavior

The task runs in a browser iframe. Responses and response timing remain in that browser, rather than making a Streamlit server round trip for each answer. There is no central response database and no automatic upload of responses to GitHub. Export results before closing, clearing browser storage, or starting another visit. Each browser keeps only its latest visit backup when local storage is available; blocked storage falls back to memory and is indicated on screen. Avoid multiple task tabs in the same browser.

A refresh ends an unfinished visit as `interrupted_reload`; it does not resume active work. Time limits and interruptions are censored observations. This is a student demonstration, not a validated research deployment; use demonstration participant codes.

The standalone `index.html` also runs when opened alongside `engine.js` and `app.js`.

## Maintenance

Streamlit is pinned to 1.55.0 to retain the iframe HTML API used here. The API is deprecated in newer releases; review the embedding implementation before upgrading. No npm build is required. Run `node test_engine.cjs` to check the existing ratio and item-generation logic.

## Verification for this adaptation

Passed the existing ratio and deterministic puzzle checks, a simulated full task flow, JavaScript/Python syntax checks, and Streamlit AppTest loading the bundled iframe without exceptions. Browser downloads and visual layout still need a live browser check after deployment; automated browser installation was unavailable in the build environment.


## Heart rate (version 0.3)

Use desktop Chrome on the researcher Mac. Wear the moistened H7 strap and close other tabs/apps connected to it. On the researcher setup screen, select Record heart rate and click Connect heart-rate sensor. Select the H7 in Chrome's chooser. The setup shows beats/min, contact status, and reading age. Begin visit is enabled after three consecutive fresh, nonzero readings without a reported contact failure. A signal older than five seconds disables starting. Task only mode remains available.

Begin visit removes the heart-rate display and begins recording at the seated rest period. Recording continues through practice, work, feedback, and breaks. End for today or the visit limit stops recording and disconnects. Setup readings are not included in the continuous recording, but a verification snapshot is stored. Disconnects, contact changes, and gaps longer than five seconds are logged without displaying physiological feedback to the participant. The task continues during a gap; the app attempts reconnection to the same sensor every five seconds. Gaps must be reviewed in results; successful setup does not guarantee uninterrupted data.

Complete JSON includes heart_rate samples and events. Heart-rate CSV provides notification-level rows; Beat-interval CSV provides each RR interval separately. RR intervals are decoded in milliseconds from Bluetooth units of 1/1024 second. Both task events and received HR packets use the same browser clock. Receipt time is not the exact heartbeat time; intervals in one notification share its receipt timestamp. No precise physiological synchronization or measurement validity is claimed. Raw ECG is not recorded.

HR data stay in the browser and its latest-visit backup; they are not sent to Python, GitHub, or a central response database. Backups update at task transitions and approximately every five seconds during HR recording; an abrupt close can lose the last few seconds. Export before closing. Reload ends the visit as interrupted; reconnect for a new visit. Avoid multiple task tabs and keep the computer awake.

If the embedded Streamlit page blocks Bluetooth, use Download standalone task at the top of the page, then open the downloaded HTML in Chrome. It contains the complete task and HR recorder, works without Python, and has its own browser backup. Do this before starting a visit, not mid-visit.

Verification: `node test_hr.cjs` covers standard packet decoding, malformed packets, readiness/stale gates, removal of HR from participant screens, phase recording, simulated reconnect, break/reset, end-of-visit stop, and export controls. These automated checks use synthetic samples. Actual H7 connection requires testing on the researcher Mac.
