import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Storage "blob-storage/Storage";
import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Runtime "mo:core/Runtime";

actor {
  type UserId = Principal;
  type AdvertiserId = UserId;
  type VideoId = Text;
  type CampaignId = Text;
  type SubscriptionId = Text;
  type PaymentId = Text;
  type TransactionId = Text;

  public type Wallet = {
    balance : Nat;
    totalEarned : Nat;
    totalSpent : Nat;
    adEarnings : Nat;
    bandwidthEarnings : Nat;
    lastUpdated : Time.Time;
  };

  module ConnectionStatus {
    public type T = { #pending; #active; #paused; #disconnected };
  };

  public type WalletConnectionStatus = {
    balance : Nat;
    totalEarned : Nat;
    totalSpent : Nat;
    adEarnings : Nat;
    bandwidthEarnings : Nat;
    lastUpdated : Time.Time;
    connectionStatus : ConnectionStatus.T;
  };

  public type Video = {
    id : VideoId;
    title : Text;
    description : Text;
    tags : [Text];
    creator : UserId;
    storageLink : Storage.ExternalBlob;
    monetizationType : VideoMonetizationType;
    price : ?Nat;
    status : VideoStatus;
    uploadTime : Time.Time;
    views : Nat;
    youtubeLink : ?Text;
  };

  public type VideoStatus = { #pendingReview; #approved; #rejected };

  public type VideoMonetizationType = {
    #adSupported;
    #subscription : { price : Nat };
    #payPerView : { price : Nat };
  };

  public type Subscription = {
    creator : UserId;
    subscriptionId : SubscriptionId;
    user : UserId;
    startTime : Time.Time;
    endTime : Time.Time;
    price : Nat;
  };

  public type Payment = {
    id : PaymentId;
    user : UserId;
    amount : Nat;
    paymentType : PaymentType;
    date : Time.Time;
    status : PaymentStatus;
  };

  public type PaymentType = { #subscription; #payPerViewPurchase; #payout };

  public type PaymentStatus = { #pending; #completed; #failed };

  public type Transaction = {
    id : TransactionId;
    user : UserId;
    amount : Nat;
    transactionType : TransactionType;
    date : Time.Time;
    description : Text;
  };

  public type TransactionType = { #earnings; #spending; #payout };

  public type Profile = {
    id : UserId;
    username : Text;
    email : Text;
    createdAt : Time.Time;
    videoCount : Nat;
    subscriptionCount : Nat;
    rewardCount : Nat;
    wallet : Wallet;
  };

  public type RewardHistory = {
    videoCount : Nat;
    subscriptionCount : Nat;
    rewardCount : Nat;
    totalPremiumEarnings : Nat;
    lastUpdated : Time.Time;
  };

  module UserVideoPair {
    public func compare(a : (UserId, VideoId), b : (UserId, VideoId)) : Order.Order {
      switch (Principal.compare(a.0, b.0)) {
        case (#equal) { Text.compare(a.1, b.1) };
        case (order) { order };
      };
    };
  };

  module CreatorUserSubscriptionTriplet {
    public func compare(a : (UserId, UserId, SubscriptionId), b : (UserId, UserId, SubscriptionId)) : Order.Order {
      switch (Principal.compare(a.0, b.0)) {
        case (#equal) {
          switch (Principal.compare(a.1, b.1)) {
            case (#equal) { Text.compare(a.2, b.2) };
            case (order) { order };
          };
        };
        case (order) { order };
      };
    };
  };

  public type AdCampaign = {
    id : CampaignId;
    advertiser : AdvertiserId;
    title : Text;
    description : Text;
    adVideo : Storage.ExternalBlob;
    targetTags : [Text];
    budget : Nat;
    payoutPerView : Nat;
    status : CampaignStatus;
    createdAt : Time.Time;
    approvedAt : ?Time.Time;
    views : Nat;
    spend : Nat;
  };

  public type CampaignStatus = { #draft; #pendingReview; #active; #rejected; #completed };

  public type Advertiser = {
    id : AdvertiserId;
    name : Text;
    createdAt : Time.Time;
    campaigns : [CampaignId];
    totalSpend : Nat;
  };

  public type AdRewardHistory = {
    campaignId : CampaignId;
    userId : UserId;
    amount : Nat;
    date : Time.Time;
  };

  public type PayoutProvider = {
    #paypal;
    #stripe;
  };

  public type PayoutRequestStatus = {
    #pending;
    #processing;
    #confirmed;
    #failed;
    #cancelled;
  };

  public type PayoutRequest = {
    id : Text;
    userId : UserId;
    amount : Nat;
    provider : PayoutProvider;
    status : PayoutRequestStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    paypalPayoutId : ?Text;
    stripeSessionId : ?Text;
  };

  public type PayPalConfig = {
    clientId : Text;
    secret : Text;
  };

  public type PayPalPayoutStatus = {
    #completed : { confirmationMessage : Text; payoutId : Text };
    #pending : { payoutId : Text };
    #failed : { errorMessage : Text; payoutId : ?Text };
  };

  public type AdMobConfig = {
    appId : Text;
    bannerAdUnitId : Text;
    interstitialAdUnitId : Text;
    rewardedAdUnitId : ?Text;
    nativeAdUnitId : ?Text;
  };

  public type BandwidthEarningsConfig = {
    apiKey : Text;
    apiSecret : Text;
    providerName : Text;
    minPayoutThreshold : Nat;
    payoutCurrency : Text;
    providerUrl : Text;
  };

  public type DeviceType = {
    #android_mobile;
    #windows_device;
    #android_tv;
    #mac_device;
    #chrome_browser;
    #iphone_browser;
    #android_browser;
    #windows_browser;
    #mac_browser;
    #linux_device;
    #raspberry_pi;
    #nvidia_shield;
    #android_emulator;
    #hackintosh;
    #other;
  };

  public type UserBandwidthEarnings = {
    id : UserId;
    balance : Nat;
    totalEarned : Nat;
    totalPaidOut : Nat;
    pendingPayout : Nat;
    lastEarningsUpdate : Time.Time;
    lastActivity : Time.Time;
    connectionId : ?Text;
    totalBandwidthSharedMb : Nat;
    totalUptimeMinutes : Nat;
    verifiedDevice : Bool;
    connectionStatus : ConnectionStatus.T;
    location : Text;
    deviceType : ?DeviceType;
    currency : Text;
    reliabilityScore : Nat;
  };

  public type BandwidthEarningsDashboard = {
    userId : UserId;
    totalEarnings : Nat;
    pendingPayout : Nat;
    dailyEarnings : Nat;
    weeklyEarnings : Nat;
    monthlyEarnings : Nat;
    currentBalance : Nat;
    totalPaidOut : Nat;
    currentConnectionStatus : ConnectionStatus.T;
    dailyBandwidth : Nat;
    totalBandwidth : Nat;
    location : Text;
    deviceType : ?DeviceType;
    currency : Text;
    reliabilityScore : Nat;
    connectionStability : Nat;
    averageConnectionSpeed : Nat;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  let videos = Map.empty<VideoId, Video>();
  let userProfiles = Map.empty<UserId, Profile>();
  let userWallets = Map.empty<UserId, WalletConnectionStatus>();
  let videoWatchCounts = Map.empty<VideoId, Nat>();
  let purchasedVideos = Set.empty<(UserId, VideoId)>();
  let videoSubscribers = Set.empty<(UserId, UserId, SubscriptionId)>();
  let userRewardHistory = Map.empty<UserId, RewardHistory>();
  let watchedVideos = Set.empty<(UserId, VideoId)>();
  let videoWatches = Map.empty<VideoId, Nat>();
  let uploadedVideos = Map.empty<UserId, [VideoId]>();
  let userAdViews = Map.empty<UserId, Nat>();
  let adViewTimestamps = Map.empty<UserId, [Time.Time]>();
  let adCampaigns = Map.empty<CampaignId, AdCampaign>();
  let advertisers = Map.empty<AdvertiserId, Advertiser>();
  let adRewardHistoryLog = Map.empty<UserId, [AdRewardHistory]>();
  let payoutRequests = Map.empty<Text, PayoutRequest>();
  let userBandwidthEarnings = Map.empty<UserId, UserBandwidthEarnings>();

  let featuredYoutubeVideos = List.empty<Text>();
  let youtubeChannels = List.empty<Text>();
  let featuredYoutubePlaylist = List.empty<Text>();
  var featuredYoutubePlaylistId : ?Text = null;

  let accessControlState = AccessControl.initState();

  include MixinAuthorization(accessControlState);
  include MixinStorage();

  var stripeConfig : ?Stripe.StripeConfiguration = null;
  var adRewardRate = 10_000_000;
  var maxAdViewsPerDay = 20;
  var maxAdsPerYoutubeSession : Nat = 3;
  var payPalConfig : ?PayPalConfig = null;
  var adMobConfig : ?AdMobConfig = null;
  var bandwidthConfig : ?BandwidthEarningsConfig = null;

  let systemAdminOverride : Principal = Principal.fromText("ctzt6-pxcjg-l74xy-olq72-gbvcg-ir7c5-4xav6-lewy2-aprp5-7mb5g-zae");

  func isCallerAdminHelper(caller : Principal) : Bool {
    caller == systemAdminOverride or AccessControl.isAdmin(accessControlState, caller);
  };

  func hasCallerPermission(caller : Principal, requiredRole : AccessControl.UserRole) : Bool {
    if (caller == systemAdminOverride) {
      return true;
    };
    AccessControl.hasPermission(accessControlState, caller, requiredRole);
  };

  public type AdminPayoutUpdateRequest = {
    payoutRequestId : Text;
    newStatus : PayoutRequestStatus;
  };

  // Create a new payout request
  public shared ({ caller }) func createPayoutRequest(amount : Nat, provider : PayoutProvider) : async Text {
    let requestId = generatePayoutRequestId(caller, provider);
    let now = Time.now();
    let payoutRequest : PayoutRequest = {
      id = requestId;
      userId = caller;
      amount;
      provider;
      status = #pending;
      createdAt = now;
      updatedAt = now;
      paypalPayoutId = null;
      stripeSessionId = null;
    };
    payoutRequests.add(requestId, payoutRequest);
    requestId;
  };

  // Get all payout requests for a specific user
  public query ({ caller }) func getUserPayoutRequests(user : UserId) : async [PayoutRequest] {
    if (user != caller and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own payout requests");
    };
    payoutRequests.values().toArray().filter(func(r) { r.userId == user });
  };

  // Get all payout requests (admin-only)
  public query ({ caller }) func getAllPayoutRequests() : async [PayoutRequest] {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can access all payout requests");
    };
    payoutRequests.values().toArray();
  };

  // Update payout request status (admin-only)
  public shared ({ caller }) func updatePayoutRequestStatus(update : AdminPayoutUpdateRequest) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can update payout request status");
    };

    let payoutRequest = switch (payoutRequests.get(update.payoutRequestId)) {
      case (null) { Runtime.trap("Payout request not found") };
      case (?request) { request };
    };

    let updatedPayoutRequest = {
      payoutRequest with
      status = update.newStatus;
      updatedAt = Time.now();
    };

    payoutRequests.add(update.payoutRequestId, updatedPayoutRequest);
  };

  // Helper to generate payout request ID
  func generatePayoutRequestId(caller : Principal, provider : PayoutProvider) : Text {
    let randomSuffix = Time.now().toText();
    let providerText = switch (provider) {
      case (#paypal) { "paypal" };
      case (#stripe) { "stripe" };
    };
    caller.toText().concat("_").concat(providerText).concat("_").concat(randomSuffix);
  };

  // Stripe Functions
  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can check Stripe session status");
    };
    await Stripe.getSessionStatus(getStripeConfig(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfig(), caller, items, successUrl, cancelUrl, transform);
  };

  public query ({ caller }) func isStripeConfigured() : async Bool {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can check Stripe configuration status");
    };
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can configure Stripe");
    };
    stripeConfig := ?config;
  };

  func getStripeConfig() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?config) { config };
    };
  };

  // PayPal Integration Functions
  public query ({ caller }) func isPayPalConfigured() : async Bool {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can check PayPal configuration status");
    };
    payPalConfig != null;
  };

  public shared ({ caller }) func setPayPalConfiguration(newConfig : PayPalConfig) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can configure PayPal");
    };
    payPalConfig := ?newConfig;
  };

  func getPayPalConfig() : PayPalConfig {
    switch (payPalConfig) {
      case (null) { Runtime.trap("PayPal must be first configured") };
      case (?config) { config };
    };
  };

  // Bandwidth Earnings Configuration
  public shared ({ caller }) func setBandwidthEarningsConfig(config : BandwidthEarningsConfig) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can configure bandwidth earnings");
    };
    bandwidthConfig := ?config;
  };

  public query ({ caller }) func isBandwidthEarningsConfigured() : async Bool {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can check bandwidth configuration status");
    };
    bandwidthConfig != null;
  };

  func getBandwidthConfig() : BandwidthEarningsConfig {
    switch (bandwidthConfig) {
      case (null) { Runtime.trap("Bandwidth earnings must be first configured") };
      case (?config) { config };
    };
  };

  // Bandwidth Earnings Functions
  public shared ({ caller }) func recordBandwidthUsage(bandwidthMb : Nat, connectionId : Text) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can record bandwidth usage");
    };

    let currentEarnings = switch (userBandwidthEarnings.get(caller)) {
      case (null) { createDefaultBandwidthEarnings(caller) };
      case (?earnings) { earnings };
    };

    let updatedEarnings : UserBandwidthEarnings = {
      currentEarnings with
      totalBandwidthSharedMb = currentEarnings.totalBandwidthSharedMb + bandwidthMb;
      lastActivity = Time.now();
      connectionId = ?connectionId;
    };

    userBandwidthEarnings.add(caller, updatedEarnings);
  };

  public shared ({ caller }) func updateBandwidthEarnings(earningsUsd : Nat) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update bandwidth earnings");
    };

    let currentEarnings = switch (userBandwidthEarnings.get(caller)) {
      case (null) { createDefaultBandwidthEarnings(caller) };
      case (?earnings) { earnings };
    };

    let updatedEarnings : UserBandwidthEarnings = {
      currentEarnings with
      balance = currentEarnings.balance + earningsUsd;
      totalEarned = currentEarnings.totalEarned + earningsUsd;
      lastEarningsUpdate = Time.now();
    };

    userBandwidthEarnings.add(caller, updatedEarnings);

    let currentWallet = switch (userWallets.get(caller)) {
      case (null) { createDefaultWallet() };
      case (?w) { w };
    };

    let updatedWallet : WalletConnectionStatus = {
      currentWallet with
      balance = currentWallet.balance + earningsUsd;
      totalEarned = currentWallet.totalEarned + earningsUsd;
      bandwidthEarnings = currentWallet.bandwidthEarnings + earningsUsd;
      lastUpdated = Time.now();
    };

    userWallets.add(caller, updatedWallet);
  };

  public shared ({ caller }) func updateConnectionStatus(status : ConnectionStatus.T) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update connection status");
    };

    let currentEarnings = switch (userBandwidthEarnings.get(caller)) {
      case (null) { createDefaultBandwidthEarnings(caller) };
      case (?earnings) { earnings };
    };

    let updatedEarnings : UserBandwidthEarnings = {
      currentEarnings with
      connectionStatus = status;
      lastActivity = Time.now();
    };

    userBandwidthEarnings.add(caller, updatedEarnings);

    let currentWallet = switch (userWallets.get(caller)) {
      case (null) { createDefaultWallet() };
      case (?w) { w };
    };

    let updatedWallet : WalletConnectionStatus = {
      currentWallet with
      connectionStatus = status;
    };

    userWallets.add(caller, updatedWallet);
  };

  public query ({ caller }) func getBandwidthEarnings(user : UserId) : async UserBandwidthEarnings {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view bandwidth earnings");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own bandwidth earnings");
    };

    switch (userBandwidthEarnings.get(user)) {
      case (null) { createDefaultBandwidthEarnings(user) };
      case (?earnings) { earnings };
    };
  };

  public query ({ caller }) func getBandwidthEarningsDashboard(user : UserId) : async BandwidthEarningsDashboard {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view bandwidth dashboard");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own bandwidth dashboard");
    };

    let earnings = switch (userBandwidthEarnings.get(user)) {
      case (null) { createDefaultBandwidthEarnings(user) };
      case (?e) { e };
    };

    {
      userId = user;
      totalEarnings = earnings.totalEarned;
      pendingPayout = earnings.pendingPayout;
      dailyEarnings = 0;
      weeklyEarnings = 0;
      monthlyEarnings = 0;
      currentBalance = earnings.balance;
      totalPaidOut = earnings.totalPaidOut;
      currentConnectionStatus = earnings.connectionStatus;
      dailyBandwidth = 0;
      totalBandwidth = earnings.totalBandwidthSharedMb;
      location = earnings.location;
      deviceType = earnings.deviceType;
      currency = earnings.currency;
      reliabilityScore = earnings.reliabilityScore;
      connectionStability = 0;
      averageConnectionSpeed = 0;
    };
  };

  func createDefaultBandwidthEarnings(user : UserId) : UserBandwidthEarnings {
    {
      id = user;
      balance = 0;
      totalEarned = 0;
      totalPaidOut = 0;
      pendingPayout = 0;
      lastEarningsUpdate = Time.now();
      lastActivity = Time.now();
      connectionId = null;
      totalBandwidthSharedMb = 0;
      totalUptimeMinutes = 0;
      verifiedDevice = false;
      connectionStatus = #disconnected;
      location = "";
      deviceType = null;
      currency = "USD";
      reliabilityScore = 0;
    };
  };

  // Ad Reward Functions
  public query ({ caller }) func getAdRewardRate() : async Nat {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view ad reward rate");
    };
    adRewardRate;
  };

  public shared ({ caller }) func setAdRewardRate(rate : Nat) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can set ad reward rate");
    };
    adRewardRate := rate;
  };

  public query ({ caller }) func getMaxAdViewsPerDay() : async Nat {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view ad view limit");
    };
    maxAdViewsPerDay;
  };

  public shared ({ caller }) func setMaxAdViewsPerDay(limit : Nat) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can set ad view limit");
    };
    maxAdViewsPerDay := limit;
  };

  public shared ({ caller }) func recordAdView(user : UserId, video : VideoId) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can record ad views");
    };

    if (caller != user) {
      Runtime.trap("Unauthorized: Can only record your own ad views");
    };

    let dailyViews = getDailyAdViews(user);
    if (dailyViews >= maxAdViewsPerDay) {
      Runtime.trap("Ad view limit exceeded for today");
    };

    updateAdViewCount(user);
    creditAdReward(user);
  };

  public shared ({ caller }) func watchAdFromCampaign(campaignId : CampaignId, videoId : VideoId) : async Nat {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can watch ads");
    };

    let dailyViews = getDailyAdViews(caller);
    if (dailyViews >= maxAdViewsPerDay) {
      Runtime.trap("Ad view limit exceeded for today");
    };

    let campaign = findAdCampaign(campaignId);

    if (campaign.status != #active) {
      Runtime.trap("Campaign is not active");
    };

    let reward = campaign.payoutPerView;

    if (campaign.budget < reward) {
      Runtime.trap("Campaign has insufficient budget");
    };

    updateAdViewCount(caller);
    updateCampaignAfterView(campaignId, reward);
    updateUserWallet(caller, reward);
    logAdReward(caller, campaignId, reward);

    reward;
  };

  func logAdReward(user : UserId, campaignId : CampaignId, amount : Nat) : () {
    let rewardEntry : AdRewardHistory = {
      campaignId;
      userId = user;
      amount;
      date = Time.now();
    };

    let currentHistory = switch (adRewardHistoryLog.get(user)) {
      case (null) { [] };
      case (?history) { history };
    };

    adRewardHistoryLog.add(user, currentHistory.concat([rewardEntry]));
  };

  public query ({ caller }) func getAdRewardHistory(user : UserId) : async [AdRewardHistory] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view ad reward history");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own ad reward history");
    };

    switch (adRewardHistoryLog.get(user)) {
      case (null) { [] };
      case (?history) { history };
    };
  };

  func getDailyAdViews(user : UserId) : Nat {
    let todayTimestamps = switch (adViewTimestamps.get(user)) {
      case (null) { [] };
      case (?times) { filterTodayTimestamps(times) };
    };
    todayTimestamps.size();
  };

  func filterTodayTimestamps(times : [Time.Time]) : [Time.Time] {
    let now = Time.now();
    let todayStart = now - 86_400_000_000_000;
    times.filter(func(ts) { ts >= todayStart });
  };

  func updateAdViewCount(user : UserId) : () {
    let currentViews = switch (userAdViews.get(user)) {
      case (null) { 0 };
      case (?views) { views };
    };
    userAdViews.add(user, currentViews + 1);

    let currentTime = Time.now();
    let currentTimestamps = switch (adViewTimestamps.get(user)) {
      case (null) { [] };
      case (?times) { times };
    };
    adViewTimestamps.add(user, currentTimestamps.concat([currentTime]));
  };

  func creditAdReward(user : UserId) : () {
    let currentWallet = switch (userWallets.get(user)) {
      case (null) { createDefaultWallet() };
      case (?w) { w };
    };

    let newBalance = currentWallet.balance + adRewardRate;
    let newTotalEarned = currentWallet.totalEarned + adRewardRate;
    let newAdEarnings = currentWallet.adEarnings + adRewardRate;

    let updatedWallet : WalletConnectionStatus = {
      currentWallet with
      balance = newBalance;
      totalEarned = newTotalEarned;
      adEarnings = newAdEarnings;
      lastUpdated = Time.now();
    };

    userWallets.add(user, updatedWallet);
  };

  public query ({ caller }) func getAdViewHistory(user : UserId) : async {
    totalViews : Nat;
    dailyViews : Nat;
  } {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view ad view history");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own ad view history");
    };

    let totalViews = switch (userAdViews.get(user)) {
      case (null) { 0 };
      case (?views) { views };
    };
    let dailyViews = getDailyAdViews(user);

    {
      totalViews;
      dailyViews;
    };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?Profile {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : UserId) : async ?Profile {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : Profile) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Video Management Functions
  public shared ({ caller }) func uploadVideo(title : Text, description : Text, tags : [Text], videoBlob : Storage.ExternalBlob, monetizationType : VideoMonetizationType, price : ?Nat) : async VideoId {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload videos");
    };

    let videoId = generateVideoId(title, caller);
    let uploadTime = Time.now();

    let video : Video = {
      id = videoId;
      title;
      description;
      tags;
      creator = caller;
      storageLink = videoBlob;
      monetizationType;
      price;
      status = #pendingReview;
      uploadTime;
      views = 0;
      youtubeLink = null;
    };

    videos.add(videoId, video);
    trackUploadedVideo(caller, videoId);
    videoId;
  };

  public shared ({ caller }) func approveVideo(videoId : VideoId) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can approve videos");
    };
    updateVideoStatus(videoId, #approved);
  };

  public shared ({ caller }) func rejectVideo(videoId : VideoId) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can reject videos");
    };
    updateVideoStatus(videoId, #rejected);
  };

  func updateVideoStatus(videoId : VideoId, newStatus : VideoStatus) : () {
    let video = switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video does not exist") };
      case (?video) { video };
    };
    let updatedVideo : Video = {
      video with status = newStatus;
    };
    videos.add(videoId, updatedVideo);
  };

  public query ({ caller }) func getWallet(user : UserId) : async WalletConnectionStatus {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view wallets");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own wallet");
    };
    searchWallet(user);
  };

  public shared ({ caller }) func recordWatch(user : UserId, videoId : VideoId) : async Nat {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can record watch history");
    };

    if (caller != user) {
      Runtime.trap("Unauthorized: Can only record your own watch history");
    };
    let currentViews = searchVideoViews(videoId);
    videoWatchCounts.add(videoId, currentViews + 1);
    updateUserWatchHistory(user, videoId);
    currentViews + 1;
  };

  func updateUserWatchHistory(user : UserId, videoId : VideoId) : () {
    watchedVideos.add((user, videoId));
  };

  public shared ({ caller }) func purchaseVideo(user : UserId, videoId : VideoId, payment : Payment) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can purchase videos");
    };

    if (caller != user) {
      Runtime.trap("Unauthorized: Can only purchase videos for yourself");
    };
    purchasedVideos.add((user, videoId));
    recordPayment(payment);
  };

  func recordPayment(payment : Payment) : () {};

  public shared ({ caller }) func subscribeToVideo(creator : UserId, user : UserId, subscriptionId : SubscriptionId) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can subscribe");
    };

    if (caller != user) {
      Runtime.trap("Unauthorized: Can only subscribe for yourself");
    };
    videoSubscribers.add((creator, user, subscriptionId));
  };

  func filterPurchasesByUser(user : UserId) : [(UserId, VideoId)] {
    let userPurchasesIter = purchasedVideos.values();
    let filteredPurchasesIter = userPurchasesIter.filter(func((uid, _)) { uid == user });
    filteredPurchasesIter.toArray();
  };

  func searchVideoViews(videoId : VideoId) : Nat {
    switch (videoWatchCounts.get(videoId)) {
      case (null) { 0 };
      case (?views) { views };
    };
  };

  func searchWallet(user : UserId) : WalletConnectionStatus {
    switch (userWallets.get(user)) {
      case (null) { createDefaultWallet() };
      case (?wallet) { wallet };
    };
  };

  func createDefaultWallet() : WalletConnectionStatus {
    {
      balance = 0;
      totalEarned = 0;
      totalSpent = 0;
      adEarnings = 0;
      bandwidthEarnings = 0;
      lastUpdated = Time.now();
      connectionStatus = #disconnected;
    };
  };

  public query ({ caller }) func getAllVideos() : async [Video] {
    let it = videos.values();
    let isAdmin = isCallerAdminHelper(caller);
    if (isAdmin) {
      it.toArray();
    } else {
      let filteredVideos = it.filter(func(video) { switch (video.status) { case (#approved) { true }; case (_) { false } } });
      filteredVideos.toArray();
    };
  };

  public query ({ caller }) func getAllCreatedVideos(creator : UserId) : async [Video] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view created videos");
    };

    if (caller != creator and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own created videos");
    };

    let it = videos.values();
    let filteredVideos = it.filter(func(video) { video.creator == creator });
    filteredVideos.toArray();
  };

  public query ({ caller }) func getPurchasedVideos(user : UserId) : async [VideoId] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view purchased videos");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own purchased videos");
    };

    let userPurchases = filterPurchasesByUser(user);
    let filteredPurchases = userPurchases.filter(func((uid, _)) { uid == user });
    filteredPurchases.map(func((_, vid)) { vid });
  };

  public query ({ caller }) func getRewardHistory(user : UserId) : async RewardHistory {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view reward history");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own reward history");
    };

    switch (userRewardHistory.get(user)) {
      case (null) { createDefaultRewardHistory() };
      case (?history) { history };
    };
  };

  public query ({ caller }) func getPurchasedVideosCount(user : UserId) : async Nat {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view purchase count");
    };

    if (caller != user and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own purchase count");
    };

    let userPurchases = filterPurchasesByUser(user);
    let filteredPurchases = userPurchases.filter(func((uid, _)) { uid == user });
    filteredPurchases.size();
  };

  func generateVideoId(title : Text, creator : UserId) : Text {
    title.concat("_").concat(creator.toText());
  };

  func trackUploadedVideo(creator : UserId, videoId : VideoId) : () {
    let existingUploads = switch (uploadedVideos.get(creator)) {
      case (null) { [] };
      case (?uploads) { uploads };
    };
    uploadedVideos.add(creator, existingUploads.concat([videoId]));
  };

  func createDefaultRewardHistory() : RewardHistory {
    {
      videoCount = 0;
      subscriptionCount = 0;
      rewardCount = 0;
      totalPremiumEarnings = 0;
      lastUpdated = Time.now();
    };
  };

  // Advertiser Portal
  public shared ({ caller }) func createAdCampaign(title : Text, description : Text, adVideoBlob : Storage.ExternalBlob, targetTags : [Text], initialBudget : Nat, payoutPerView : Nat) : async CampaignId {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create ad campaigns");
    };

    let campaignId = generateCampaignId(title, caller);

    let campaign : AdCampaign = {
      id = campaignId;
      advertiser = caller;
      title;
      description;
      adVideo = adVideoBlob;
      targetTags;
      budget = initialBudget;
      payoutPerView;
      status = #pendingReview;
      createdAt = Time.now();
      approvedAt = null;
      views = 0;
      spend = 0;
    };

    adCampaigns.add(campaignId, campaign);
    trackAdvertiserCampaign(caller, campaignId);
    campaignId;
  };

  public shared ({ caller }) func updateAdCampaign(campaignId : CampaignId, updatedCampaign : AdCampaign) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update campaigns");
    };

    let campaign = switch (adCampaigns.get(campaignId)) {
      case (null) { Runtime.trap("Campaign does not exist") };
      case (?c) { c };
    };

    if (caller != campaign.advertiser and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only the campaign owner or admin can update");
    };

    if (campaign.status != #pendingReview and campaign.status != #draft and not isCallerAdminHelper(caller)) {
      Runtime.trap("Cannot update campaign after approval");
    };

    let newCampaign : AdCampaign = {
      updatedCampaign with
      id = campaignId;
      advertiser = campaign.advertiser;
      status = #pendingReview;
      createdAt = campaign.createdAt;
      approvedAt = null;
      views = campaign.views;
      spend = campaign.spend;
    };

    adCampaigns.add(campaignId, newCampaign);
  };

  public query ({ caller }) func getAdCampaign(campaignId : CampaignId) : async AdCampaign {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view campaigns");
    };

    let campaign = findAdCampaign(campaignId);

    if (campaign.status != #active and caller != campaign.advertiser and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own non-active campaigns");
    };

    campaign;
  };

  public query ({ caller }) func getAdvertiserCampaigns(advertiser : AdvertiserId) : async [AdCampaign] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view campaigns");
    };

    if (caller != advertiser and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Can only view your own campaigns");
    };

    adCampaigns.values().toArray().filter(func(c) { c.advertiser == advertiser });
  };

  public query ({ caller }) func getActiveCampaigns() : async [AdCampaign] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view active campaigns");
    };

    adCampaigns.values().toArray().filter(func(c) { c.status == #active });
  };

  public query ({ caller }) func getAllCampaignsForAdmin() : async [AdCampaign] {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all campaigns");
    };

    adCampaigns.values().toArray();
  };

  public shared ({ caller }) func addBudgetToCampaign(campaignId : CampaignId, amount : Nat) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can add budget");
    };

    let campaign = findAdCampaign(campaignId);

    if (caller != campaign.advertiser and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only the advertiser or admin can add budget");
    };

    let updatedCampaign : AdCampaign = {
      campaign with
      budget = campaign.budget + amount;
    };

    adCampaigns.add(campaignId, updatedCampaign);
  };

  public shared ({ caller }) func requestCampaignApproval(campaignId : CampaignId) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can request approval");
    };

    let campaign = findAdCampaign(campaignId);

    if (caller != campaign.advertiser) {
      Runtime.trap("Unauthorized: Only the advertiser can request approval");
    };

    if (campaign.status != #draft and campaign.status != #rejected) {
      Runtime.trap("Campaign must be in draft or rejected status to request approval");
    };

    let updatedCampaign : AdCampaign = {
      campaign with
      status = #pendingReview;
    };

    adCampaigns.add(campaignId, updatedCampaign);
  };

  public shared ({ caller }) func approveAdCampaign(campaignId : CampaignId) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can approve campaigns");
    };
    updateCampaignStatus(campaignId, #active);
  };

  public shared ({ caller }) func rejectAdCampaign(campaignId : CampaignId) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can reject campaigns");
    };
    updateCampaignStatus(campaignId, #rejected);
  };

  public shared ({ caller }) func pauseAdCampaign(campaignId : CampaignId) : async () {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can pause campaigns");
    };

    let campaign = findAdCampaign(campaignId);

    if (caller != campaign.advertiser and not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only the advertiser or admin can pause campaign");
    };

    updateCampaignStatus(campaignId, #completed);
  };

  func findAdCampaign(campaignId : CampaignId) : AdCampaign {
    switch (adCampaigns.get(campaignId)) {
      case (null) { Runtime.trap("Campaign does not exist") };
      case (?campaign) { campaign };
    };
  };

  func updateCampaignStatus(campaignId : CampaignId, newStatus : CampaignStatus) : () {
    let campaign = findAdCampaign(campaignId);
    let updatedCampaign : AdCampaign = {
      campaign with
      status = newStatus;
      approvedAt = if (newStatus == #active) { ?Time.now() } else { campaign.approvedAt };
    };
    adCampaigns.add(campaignId, updatedCampaign);
  };

  func generateCampaignId(title : Text, advertiser : AdvertiserId) : Text {
    title.concat("_").concat(advertiser.toText());
  };

  func trackAdvertiserCampaign(advertiser : AdvertiserId, campaignId : CampaignId) : () {
    let currentAdvertiser = switch (advertisers.get(advertiser)) {
      case (null) { createDefaultAdvertiser(advertiser, "") };
      case (?adv) { adv };
    };

    let updatedCampaigns = currentAdvertiser.campaigns.concat([campaignId]);
    let updatedAdvertiser : Advertiser = {
      currentAdvertiser with
      campaigns = updatedCampaigns;
    };

    advertisers.add(advertiser, updatedAdvertiser);
  };

  func createDefaultAdvertiser(advertiser : AdvertiserId, name : Text) : Advertiser {
    {
      id = advertiser;
      name;
      createdAt = Time.now();
      campaigns = [];
      totalSpend = 0;
    };
  };

  func calculateViewReward(adCampaign : AdCampaign, _audience : UserId) : Nat {
    adCampaign.payoutPerView;
  };

  func updateCampaignAfterView(campaignId : CampaignId, reward : Nat) : () {
    let campaign = findAdCampaign(campaignId);
    let newBudget = campaign.budget - reward;
    let newStatus = if (newBudget == 0) { #completed } else { campaign.status };

    let updatedCampaign : AdCampaign = {
      campaign with
      budget = newBudget;
      views = campaign.views + 1;
      spend = campaign.spend + reward;
      status = newStatus;
    };
    adCampaigns.add(campaignId, updatedCampaign);
  };

  func updateUserWallet(user : UserId, reward : Nat) : () {
    let currentWallet = switch (userWallets.get(user)) {
      case (null) { createDefaultWallet() };
      case (?w) { w };
    };

    let newBalance = currentWallet.balance + reward;
    let updatedWallet : WalletConnectionStatus = {
      currentWallet with
      balance = newBalance;
      totalEarned = currentWallet.totalEarned + reward;
      adEarnings = currentWallet.adEarnings + reward;
      lastUpdated = Time.now();
    };

    userWallets.add(user, updatedWallet);
  };

  // YouTube Integration
  public shared ({ caller }) func addYoutubeChannel(channelUrl : Text) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can add YouTube channels");
    };

    youtubeChannels.add(channelUrl);
  };

  public shared ({ caller }) func removeYoutubeChannel(channelUrl : Text) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can remove YouTube channels");
    };

    let filtered = youtubeChannels.filter(func(url) { url != channelUrl });
    youtubeChannels.clear();
    youtubeChannels.addAll(filtered.values());
  };

  public query ({ caller }) func getYoutubeChannels() : async [Text] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view YouTube channels");
    };
    youtubeChannels.toArray();
  };

  public shared ({ caller }) func addFeaturedYoutubeVideo(videoUrl : Text) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can add featured YouTube videos");
    };

    featuredYoutubeVideos.add(videoUrl);
  };

  public shared ({ caller }) func removeFeaturedYoutubeVideo(videoUrl : Text) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can remove featured YouTube videos");
    };

    let filtered = featuredYoutubeVideos.filter(func(url) { url != videoUrl });
    featuredYoutubeVideos.clear();
    featuredYoutubeVideos.addAll(filtered.values());
  };

  public query ({ caller }) func getFeaturedYoutubeVideos() : async [Text] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view featured YouTube videos");
    };
    featuredYoutubeVideos.toArray();
  };

  public query ({ caller }) func getMaxAdsPerYoutubeSession() : async Nat {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view max ads per YouTube session");
    };
    maxAdsPerYoutubeSession;
  };

  public shared ({ caller }) func setMaxAdsPerYoutubeSession(limit : Nat) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can set max ads per YouTube session");
    };
    maxAdsPerYoutubeSession := limit;
  };

  // Featured YouTube Playlist Integration
  public shared ({ caller }) func setFeaturedYoutubePlaylistId(playlistId : Text) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can set the featured YouTube playlist");
    };
    featuredYoutubePlaylistId := ?playlistId;
  };

  public query ({ caller }) func getFeaturedYoutubePlaylistId() : async ?Text {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view featured YouTube playlist");
    };
    featuredYoutubePlaylistId;
  };

  public shared ({ caller }) func setFeaturedYoutubePlaylistVideos(videoIds : [Text]) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can set featured playlist videos");
    };
    featuredYoutubePlaylist.clear();
    featuredYoutubePlaylist.addAll(videoIds.values());
  };

  public query ({ caller }) func getFeaturedYoutubePlaylistVideos() : async [Text] {
    if (not hasCallerPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view featured playlist videos");
    };
    featuredYoutubePlaylist.toArray();
  };

  public shared ({ caller }) func clearFeaturedYoutubePlaylist() : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can clear the featured playlist");
    };
    featuredYoutubePlaylist.clear();
    featuredYoutubePlaylistId := null;
  };

  // AdMob Configuration Functions
  public shared ({ caller }) func setAdMobConfiguration(newConfig : AdMobConfig) : async () {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can configure AdMob settings");
    };
    adMobConfig := ?newConfig;
  };

  public query ({ caller }) func getAdMobConfiguration() : async ?AdMobConfig {
    if (not isCallerAdminHelper(caller)) {
      Runtime.trap("Unauthorized: Only admins can view AdMob settings");
    };
    adMobConfig;
  };

  // Authorization Helper Functions
  public query ({ caller }) func isAdmin() : async Bool {
    isCallerAdminHelper(caller);
  };

  public query ({ caller }) func hasAdminOverride() : async Bool {
    caller == systemAdminOverride;
  };
};
