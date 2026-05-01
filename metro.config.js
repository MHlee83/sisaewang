const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 로컬 개발 시 모노레포 루트 폴더도 감시
// EAS Build 환경에서는 루트 node_modules가 없으므로 조건부 적용
const fs = require('fs');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');
if (fs.existsSync(rootNodeModules)) {
  config.watchFolders = [monorepoRoot];
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    rootNodeModules,
  ];
} else {
  // EAS Build 환경: 앱 자체 node_modules만 사용
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
  ];
}

module.exports = config;
