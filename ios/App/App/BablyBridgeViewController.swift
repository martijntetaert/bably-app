import Capacitor
import UIKit

/// Plugins that live in the app itself instead of in an npm package are registered here.
class BablyBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeTabBarPlugin())
    }
}
