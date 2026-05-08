// Firebase mock — 실제 Firebase SDK 초기화 없이 동작
// 테스트/개발 모드용: Firebase 없이 앱 실행 가능

export const app = {} as any;

export const auth = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: null) => void) => {
    callback(null);
    return () => {};
  },
  signInWithEmailAndPassword: () => Promise.reject(new Error('mock')),
  createUserWithEmailAndPassword: () => Promise.reject(new Error('mock')),
  signOut: () => Promise.resolve(),
} as any;
