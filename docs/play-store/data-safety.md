# Play Console — Data safety answers (v1 store build)

Declare this honestly. Change it if you add login, analytics, or crash SDKs.

## Does the app collect or share user data?

**Collect (on device only):** app activity such as quiz scores and streaks stored in local preferences.  
**Share:** No, in v1 with no account and no analytics SDK.

## Data types

| Type | Collected? | Shared? | Required? | Purpose |
|------|------------|---------|-----------|---------|
| App activity (quiz/progress) | Yes, on device | No | Yes for scoring | App functionality |
| Personal info (name, email) | No | No | — | — |
| Location | No | No | — | — |
| Photos / files | No | No | — | — |
| Audio | No | No | — | — |

## Third parties

YouTube’s player may process playback data under Google’s policies. In Data safety, disclose that video playback uses YouTube / Google if the form asks about third-party SDKs.

## Security

Data in transit to a production API must use HTTPS only (release builds disable cleartext).

## Account deletion

Not applicable in v1: the store build does not create accounts. If you later add login, you must add an in-app delete-account path and update this form.
