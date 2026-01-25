
<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=flat-square&logo=next.js)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/) [![Prisma](https://img.shields.io/badge/Prisma-6.17.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/) [![XRPL](https://img.shields.io/badge/XRP_Ledger-4.4.3-25A768?style=flat-square&logo=xrp)](https://xrpl.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https:/tailwindcss.com/) [![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE) [![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://xrpl-payroll.vercel.app/)

</div>


# プロジェクト名: Seneca

<div align="center">

![Seneca Logo](public/xrpl_payroll_logo.png)


**XRP Ledger を活用した次世代給与支払いプラットフォーム**

[🚀 デモを見る](https://xrpl-payroll.vercel.app/)

</div>

---

#### デモURL: [https://xrpl-payroll.vercel.app/](https://xrpl-payroll.vercel.app/)

##### 1. 管理者アカウント
```
URL: https://xrpl-payroll.vercel.app/login
Email: admin@techinnovations.com
Password: password123
```

##### 2. 従業員アカウント
```
URL: https://xrpl-payroll.vercel.app/login
Email: john.doe@techinnovations.com
Password: password123
```


---

## 📋 目次

- [概要](#-概要)
- [🌟 主要機能](#-主要機能)
- [🎯 解決する課題](#-解決する課題)
- [💡 なぜXRPLなのか](#-なぜxrplなのか)
- [🛠️ 技術スタック](#️-技術スタック)
- [🏗️ アーキテクチャ](#️-アーキテクチャ)
- [📸 スクリーンショット](#-スクリーンショット)
- [🚀 セットアップ](#-セットアップ)
- [🔐 デモアカウント](#-デモアカウント)
- [💼 ビジネスモデル](#-ビジネスモデル)
- [📊 市場機会](#-市場機会)
- [🎯 競合優位性](#-競合優位性)
- [🗺️ ロードマップ](#️-ロードマップ)
- [👥 チーム](#-チーム)
- [📄 ライセンス](#-ライセンス)

---

## 🌟 概要

- **Seneca** は、XRP Ledger（XRPL）と RLUSD ステーブルコインを活用した、企業向け給与支払い・勤怠管理アプリを作成するプロジェクトです。多国籍で分散している従業員の勤怠を管理し、ブロックチェーンで給与を支払います。ブロックチェーン技術により、**迅速**・**低コスト**・**セキュア**な給与支払いを実現し、従来の銀行送金の課題を解決します。


### ✨ 主要機能

#### 💸 給与支払い（XRP）
- **即時決済**: 数秒で従業員へ給与を送金
- **低コスト**: 銀行手数料の1/100以下のトランザクションコスト
- **透明性**: ブロックチェーンによる完全な取引履歴の追跡
- **グローバル対応**: 国境を越えた給与支払いに対応

#### ⏱️ 包括的な勤怠管理
- **リアルタイム打刻**: Web・モバイルから出退勤の記録
- **自動集計**: 労働時間の自動計算と月次レポート生成
- **承認ワークフロー**: 管理者による勤怠承認システム
- **柔軟な修正**: 打刻ミスの修正申請・承認機能
- **休憩時間管理**: 休憩開始・終了の記録

#### 📊 管理者ダッシュボード
- **リアルタイム統計**: 従業員の勤務状況を一覧表示
- **給与計算**: 勤怠データから自動給与計算
- **レポート生成**: 月次・年次レポートのエクスポート
- **通知システム**: 重要なイベントの自動通知

#### 👤 従業員ポータル
- **個人ダッシュボード**: 勤務状況・給与履歴の確認
- **ウォレット管理**: XRP/RLUSD残高の確認
- **取引履歴**: 過去の給与支払い履歴の閲覧
- **プロフィール管理**: 個人情報の更新

---

## 🎯 解決する課題

### 1. 💰 銀行送金の高コスト（特に国際送金）

**課題**: 
- 銀行振込手数料: 1回あたり200～800円
- 国際送金手数料: 3,000～5,000円 + 為替手数料
- 中小企業にとって大きな負担

**解決策**: 
- XRPLのトランザクション手数料: 約0.00001 XRP（約0.002円）
- **コスト削減率: 99.8%以上**

### 2. ⏰ 送金の遅延

**課題**:
- 銀行振込: 1～3営業日
- 国際送金: 3～5営業日
- 給与日に間に合わないリスク

**解決策**:
- XRPLでの決済: **3～5秒で完了**
- 24時間365日対応

### 3. 📊 勤怠管理の非効率性

**課題**:
- 紙のタイムカードやExcelでの手作業管理
- 集計ミスや不正打刻のリスク
- 給与計算との連携が困難

**解決策**:
- デジタル打刻システム
- 自動集計・給与計算連携
- 改ざん防止機能

### 4. 🌍 グローバル人材への対応困難

**課題**:
- 海外在住社員への給与支払いが複雑
- 複数通貨の管理コスト
- コンプライアンス対応

**解決策**:
- XRP/RLUSDによる統一的な給与支払い
- グローバル対応のインフラ
- 透明性の高い取引記録

---

## 💡 なぜXRPLなのか

### 1. ⚡ 高速決済（3-5秒）
XRPLは世界最速級のブロックチェーンで、決済完了まで3～5秒。給与支払いにおいて即時性が求められる用途に最適です。

### 2. 💵 超低コスト
1トランザクションあたり約0.00001 XRPの手数料で、従来の銀行送金の1/1,000以下のコストを実現します。

### 3. 🔒 エンタープライズ級の信頼性
- **稼働率99.99%以上**
- **2012年から稼働実績**
- **金融機関での採用実績**（Ripple Paymentsなど）

### 4. 💎 RLUSD - 規制準拠のステーブルコイン
- **1 RLUSD = 1 USD** で価格安定
- **ニューヨーク州金融サービス局（NYDFS）承認**
- 給与支払いに最適な法定通貨ペッグ資産

### 5. 🌐 グローバル対応
- クロスボーダー決済に対応
- 複数通貨のサポート
- 24時間365日稼働

### 6. 🔐 セキュリティとトレーサビリティ
- 全取引がブロックチェーンに記録
- 改ざん不可能な監査証跡
- 透明性の高いガバナンス

---

## 🛠️ 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Next.js** | 15.5.4 | Reactフレームワーク（App Router） |
| **React** | 19.1.0 | UIライブラリ |
| **TypeScript** | 5.x | 型安全な開発 |
| **Tailwind CSS** | 4.0 | スタイリング |
| **Lucide React** | 0.545.0 | アイコン |
| **React Hook Form** | 7.64.0 | フォーム管理 |
| **Zod** | 4.1.12 | バリデーション |
| **TanStack Table** | 8.21.3 | データテーブル |
| **Recharts** | 3.2.1 | チャート・グラフ |
| **SWR** | 2.3.6 | データフェッチング |
| **date-fns** | 4.1.0 | 日付操作 |

### バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Next.js API Routes** | 15.5.4 | RESTful API |
| **NextAuth** | 5.0.0-beta.29 | 認証・認可 |
| **Prisma** | 6.17.0 | ORM |
| **PostgreSQL** | - | データベース |
| **bcryptjs** | 3.0.2 | パスワードハッシュ化 |
| **Nodemailer** | 7.0.10 | メール送信 |

### ブロックチェーン
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **xrpl.js** | 4.4.3 | XRP Ledger SDK |
| **RLUSD** | - | ステーブルコイン |

### 開発ツール
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **ESLint** | 9 | コード品質管理 |
| **Playwright** | 1.56.0 | E2Eテスト |
| **Vercel** | - | ホスティング |

### AI開発支援
- **Cline (Claude AI)**: コード生成・レビュー支援
- **GitHub Copilot**: コード補完
- **AIペアプログラミング**: 開発効率70%向上

---

## 🏗️ アーキテクチャ

```mermaid
graph TB
    subgraph Frontend["フロントエンド (Next.js)"]
        AdminUI[管理者UI]
        EmployeeUI[従業員UI]
        AuthUI[認証UI]
    end

    subgraph APILayer["API Layer (Next.js API Routes)"]
        AttendanceAPI[勤怠API]
        PayrollAPI[給与API]
        AuthAPI[認証API]
        SettingsAPI[設定API]
    end

    subgraph DatabaseLayer["Database Layer (PostgreSQL)"]
        Prisma[Prisma ORM]
        DBData["- ユーザー情報<br/>- 勤怠記録<br/>- 給与履歴"]
    end

    subgraph BlockchainLayer["Blockchain Layer (XRP Ledger)"]
        XRPLJS[xrpl.js SDK]
        BlockchainData["- RLUSD決済<br/>- トランザクション<br/>- ウォレット管理"]
    end

    AdminUI --> APILayer
    EmployeeUI --> APILayer
    AuthUI --> APILayer

    AttendanceAPI --> DatabaseLayer
    PayrollAPI --> DatabaseLayer
    PayrollAPI --> BlockchainLayer
    AuthAPI --> DatabaseLayer
    SettingsAPI --> DatabaseLayer

    Prisma --> DBData
    XRPLJS --> BlockchainData

    style Frontend fill:#e3f2fd
    style APILayer fill:#fff3e0
    style DatabaseLayer fill:#e8f5e9
    style BlockchainLayer fill:#f3e5f5
```

### 主要設計パターン
- **Server-First Architecture**: Next.js Server Componentsによる最適化
- **API First Design**: RESTful API設計
- **Type-Safe Development**: TypeScript strictモード
- **Database First**: Prismaによるスキーマ駆動開発
- **Atomic Design**: コンポーネント設計の一貫性

---

## 📸 スクリーンショット

### 🏠 ランディングページ
<img src="docs/screenshots/Screenshot-landing-page.jpg" width="300">


### 👨‍💼 管理者ダッシュボード
<img src="docs/screenshots/Screenshot-admin-dashboard.jpg" width="300">


### ⏰ 勤怠管理画面
<img src="docs/screenshots/Screenshot-admin-attendance-approve.jpg" width="300">


### 💰 給与計算・支払い
<img src="docs/screenshots/Screenshot-employee-payroll.jpg" width="300">


### 👤 従業員ダッシュボード
<img src="docs/screenshots/Screenshot-employee-dashboard.jpg" width="300">


### 💼 ウォレット管理
<img src="docs/screenshots/Screenshot-employee-wallet.jpg" width="300">


---

## 🚀 セットアップ

### 前提条件
- Node.js 20.x 以降
- PostgreSQL 14.x 以降
- npm または yarn

### 1. リポジトリのクローン
```bash
git clone https://github.com/masatojupyter/xrpl-payroll.git
cd xrpl-payroll
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env`ファイルを作成し、以下の変数を設定:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/xrpl_payroll"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email (Nodemailer)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@xrpl-payroll.com"

# XRP Ledger
XRPL_NETWORK="testnet"  # testnet or mainnet
ADMIN_WALLET_SEED="sEdV..."  # XRPLウォレットシード
```

### 4. データベースのセットアップ
```bash
# Prismaマイグレーション実行
npx prisma migrate deploy

# シードデータ投入（デモ用）
npm run db:seed
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く



---

## 🔐 デモアカウント

### 1. 管理者アカウント
```
URL: https://xrpl-payroll.vercel.app/login
Email: admin@techinnovations.com
Password: password123
```

**機能**:
- 従業員管理（追加・編集・削除）
- 勤怠承認・編集
- 給与計算・支払い
- レポート生成
- システム設定

### 2. 従業員アカウント
```
URL: https://xrpl-payroll.vercel.app/login
Email: john.doe@techinnovations.com
Password: password123
```

**機能**:
- 出退勤打刻
- 勤怠履歴確認
- 給与明細閲覧
- ウォレット管理
- プロフィール編集


---
##　デモアプリの想定顧客

####  Tech Innovations株式会社（架空企業）
- **業種**: ITスタートアップ
- **従業員数**: 10名
- **所在地**: アメリカ、インド、ブラジルなどに従業員が分散
- **ニーズ**: グローバルな給与支払いの効率化とコスト削減
- **利用シナリオ**: 従業員は、それぞれ本業を持ちながら、Tech Innovations株式会社のプロジェクトにリモートで参加。給与はXRPLで支払われ、各自の国で即時に利用可能。


### 1. 管理者による勤怠管理
- 管理者が従業員の出退勤を確認・承認
- 勤怠データをもとに給与計算を実施

### 2. 従業員による自己管理
- 従業員が自分の出退勤を打刻
- 勤怠履歴や給与明細を確認

---

## 💼 ビジネスモデル

### 📊 収益モデル

#### 1. SaaS サブスクリプション
| プラン | 価格（月額） | 対象 | 主要機能 |
|--------|--------------|------|----------|
| **Starter** | ¥5,000/月 | 1-10名 | 基本的な勤怠管理・給与支払い |
| **Business** | ¥20,000/月 | 11-50名 | 高度な分析・API連携 |
| **Enterprise** | カスタム | 51名以上 | 専用サポート・カスタマイズ |

#### 2. トランザクション手数料
- 給与支払い1件あたり: **0.5%**（最低50円、最大500円）
- XRPL手数料は別途実費

#### 3. 付加価値サービス
- **コンサルティング**: 導入支援・業務最適化
- **カスタム開発**: 既存システムとの連携
- **ホワイトラベル**: OEM提供

### 💰 収益予測（3年間）

| 年 | ユーザー企業数 | 従業員数（累計） | ARR（年間経常収益） |
|----|----------------|------------------|---------------------|
| Year 1 | 50社 | 1,000名 | ¥18,000,000 |
| Year 2 | 200社 | 5,000名 | ¥84,000,000 |
| Year 3 | 500社 | 15,000名 | ¥240,000,000 |

---

## 📊 市場機会

### 🌏 TAM（Total Addressable Market）

#### 国内市場
- **中小企業数**: 約358万社
- **従業員規模10名以上**: 約120万社
- **潜在市場規模**: 約**1.2兆円/年**

#### グローバル市場
- **中小企業数**: 約3.3億社
- **クロスボーダー人材雇用**: 急増
- **潜在市場規模**: 約**50兆円/年**

### 📈 成長機会

#### 1. リモートワーク・グローバル人材の増加
- コロナ後のリモートワーク定着
- 国境を越えた人材採用の増加
- デジタルノマドの台頭

#### 2. ブロックチェーン採用の加速
- 金融機関のCBDC実験
- DeFi市場の拡大
- Web3への関心増加

#### 3. 規制環境の整備
- RLUSDのNYDFS承認
- 日本の暗号資産規制の明確化
- グローバルな規制調和

### 🎯 ターゲット顧客

#### プライマリーターゲット
- **IT・スタートアップ企業**（10-100名規模）
- 海外在住社員を雇用している企業
- 給与支払いコスト削減を目指す企業

#### セカンダリーターゲット
- **人材派遣・BPO企業**
- グローバル展開する中堅企業
- フリーランス活用企業

---

## 🎯 競合優位性

### 🥇 競合比較

| 項目 | **Seneca** | 従来の給与システム | 他のクリプト給与 |
|------|------------------|-------------------|------------------|
| **決済速度** | ⚡ 3-5秒 | 🐢 1-3営業日 | 🏃 10-60分 |
| **トランザクションコスト** | 💰 ~0.002円 | 💸 200-800円 | 💵 50-500円 |
| **国際送金対応** | ✅ ネイティブ対応 | ⚠️ 複雑・高コスト | ✅ 対応 |
| **価格安定性（RLUSD）** | ✅ 1:1 USD ペッグ | ✅ 法定通貨 | ❌ 価格変動大 |
| **規制準拠** | 🌟法改正を期待 | ✅ 銀行規制 | ⚠️ 不明確 |
| **勤怠管理統合** | ✅ ワンストップ | ❌ 別システム | ❌ 別システム |
| **稼働率** | ✅ 99.99%+ | ✅ 高い | ⚠️ 変動あり |


### 🛡️ 差別化要因

#### 1. **RLUSD × XRPL の最適な組み合わせ**
- 規制準拠のステーブルコインと高速ブロックチェーンの融合
- 価格安定性と即時決済の両立
- エンタープライズグレードの信頼性

#### 2. **給与×勤怠のオールインワン**
- 勤怠管理から給与支払いまで一気通貫
- データ連携の手間を排除
- 業務効率化を最大化

#### 3. **エンタープライズ対応の設計**
- 複数組織管理
- 権限管理・監査証跡
- API連携（会計ソフト等）

#### 4. **AIによる高速開発**
- Cline（Claude AI）によるコード生成
- 高品質なコードを短期間で実装
- 継続的な機能拡張が容易

### 🏰 参入障壁

#### 技術的障壁
- **XRPL専門知識**: XRPLの深い理解と実装経験が必要
- **金融システム開発経験**: セキュリティ・監査要件への対応
- **スケーラブルな設計**: 大量トランザクション処理

#### 規制的障壁
- **暗号資産取扱業者登録**: 日本での事業展開に必須
- **コンプライアンス体制**: KYC/AML対応
- **国際規制対応**: 複数国での事業展開

#### ネットワーク効果
- **先行者優位**: 早期顧客獲得によるデータ蓄積
- **パートナーシップ**: 会計ソフト・人事システムとの連携
- **コミュニティ**: 開発者・ユーザーのエコシステム構築

---

## 🗺️ ロードマップ

### 📅 Phase 1: MVP（現在）
**期間**: 2026年Q1
- ✅ 基本的な勤怠管理機能
- ✅ XRP/RLUSD給与支払い（テストネット）
- ✅ 管理者・従業員ダッシュボード
- ✅ 認証・権限管理
- ✅ Vercelへのデプロイ

### 📅 Phase 2: ベータ版（2026年Q2）
- 🔄 メインネット対応
- 🔄 モバイルアプリ（PWA）
- 🔄 多言語対応（英語・日本語）
- 🔄 会計ソフト連携（freee・マネーフォワード）
- 🔄 ベータユーザー募集（10社）

### 📅 Phase 3: 正式リリース（2026年Q3）
- 📋 正式サービス開始
- 📋 暗号資産取扱業者登録申請
- 📋 有料プラン開始
- 📋 カスタマーサポート体制構築
- 📋 マーケティング本格化

### 📅 Phase 4: スケールアップ（2026年Q4～）
- 📋 API公開（サードパーティ連携）
- 📋 ホワイトラベル提供
- 📋 海外展開（シンガポール・米国）
- 📋 追加機能（年末調整・社会保険連携）
- 📋 AIによる給与最適化提案

### 🔮 将来構想
- **DeFi連携**: 給与の一部を自動運用
- **NFT給与明細**: ブロックチェーン証明
- **DAO統合**: 分散型組織の給与管理
- **クロスチェーン対応**: 他のブロックチェーン資産での支払い

---

## 👥 チーム

### 開発チーム

#### 🧑‍💻 Masato Miyai
**役割**: Full-Stack Engineer / Jupyter株式会社 Co-Founder & COO

**経歴**:
- Web3・ブロックチェーン開発経験 4年
- フルスタック開発経験 10年
- 過去プロジェクト: 暗号資産取引所のフロントエンド・iOSアプリ開発、AIチャットボット開発、LLM活用システム構築

**担当領域**:
- プロダクト設計・開発
- ブロックチェーン開発
- インフラ・DevOps

**GitHub**: [@masatojupyter](https://github.com/masatojupyter)

### Jupyter株式会社
**所在地**: 東京都渋谷区渋谷2-19-15 宮益坂ビルディング609
**事業内容**: ブロックチェーン・Web3ソリューション開発、AIシステム開発支援
**ウェブサイト**: [https://jupyter.co.jp](https://jupyter.co.jp)

## メンバー紹介
| 名前 | 役割 |
|------|------|
| **Kiichi Mitsumoto** | 代表取締役 / Co-Founder & CEO |
| **Masato Miyai** | フルスタックエンジニア / Co-Founder & COO |
| **Yuichi Morisaki** | フルスタックエンジニア / Co-Founder & CTO |
| **Philippe Devalcy** | セールス / CCO |



---


## 📄 ライセンス

このプロジェクトの著作権は[jupyter.co.jp](https://jupyter.co.jp)が所有します。

**Copyright © 2025 jupyter.co.jp. All rights reserved.**


---

## 📚 参考資料

### XRPL関連
- [XRP Ledger Documentation](https://xrpl.org/docs.html)


---

<div align="center">

**Built with ❤️ using XRP Ledger**

[![Star on GitHub](https://img.shields.io/github/stars/masatojupyter/xrpl-payroll?style=social)](https://github.com/masatojupyter/xrpl-payroll)

</div>
