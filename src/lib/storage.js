import { del, get, set } from 'idb-keyval'

const PROFILE_KEY = 'baucher:last-profile'
const SETTINGS_KEY = 'baucher:settings'

export async function loadLastProfile() {
  return (await get(PROFILE_KEY)) || null
}

export async function saveLastProfile(profile) {
  const { exams, ...withoutExams } = profile || {}
  await set(PROFILE_KEY, withoutExams)
}

export async function clearLastProfile() {
  await del(PROFILE_KEY)
}

export async function loadSettings() {
  return (
    (await get(SETTINGS_KEY)) || {
      rememberProfile: true,
      defaultExams: [
        { number: '4', name: 'SER SOCIAL Y SOCIEDAD' },
        {
          number: '6',
          name: 'TECNOLOGÍA DE INFORMACIÓN Y COMUNICACIÓN',
        },
      ],
    }
  )
}

export async function saveSettings(settings) {
  await set(SETTINGS_KEY, settings)
}