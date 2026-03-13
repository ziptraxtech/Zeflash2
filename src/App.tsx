
import { Routes, Route } from 'react-router-dom'
import ZeflashLanding from './components/ZeflashLanding'
import ChargingStations from './components/ChargingStations'
import BatteryReport from './components/BatteryReport'
import AIReport from './components/AIReport'
import AIReportCheckout from './components/AIReportCheckout'
import PlanCheckout from './components/PlanCheckout'
import PricingPlans from './components/PricingPlans'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfUse from './components/TermsOfUse'
import RefundPolicy from './components/RefundPolicy'
import ZeVaultPage from './components/ZeVaultPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ZeflashLanding />} />
      <Route path="/plans" element={<PricingPlans />} />
      <Route path="/stations" element={<ChargingStations />} />
      <Route path="/report/:deviceId" element={<BatteryReport />} />
      <Route path="/report/:deviceId/checkout" element={<AIReportCheckout />} />
      <Route path="/report/:deviceId/ai" element={<AIReport />} />
      <Route path="/checkout" element={<PlanCheckout />} />
      <Route path="/zevault" element={<ZeVaultPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
    </Routes>
  )
}

export default App