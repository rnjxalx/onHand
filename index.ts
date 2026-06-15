// Supabase 등 fetch/URL 사용 라이브러리를 위해 RN URL 폴리필을 가장 먼저 로드
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
