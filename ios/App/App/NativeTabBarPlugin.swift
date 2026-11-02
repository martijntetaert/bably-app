import Capacitor
import UIKit

/// The tab bar is UIKit's own, so it gets Liquid Glass and SF Symbols; the web app only
/// hears which tab was tapped and does the navigating itself.
@objc(NativeTabBarPlugin)
public class NativeTabBarPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "NativeTabBarPlugin"
    public let jsName = "NativeTabBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "select", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVisible", returnType: CAPPluginReturnPromise),
    ]

    private var tabBar: UITabBar?
    private var tabIds: [String] = []

    @objc func configure(_ call: CAPPluginCall) {
        guard let tabs = call.getArray("tabs", JSObject.self) else {
            call.reject("tabs is required")
            return
        }

        DispatchQueue.main.async {
            let tabBar = self.tabBar ?? self.makeTabBar()

            self.tabIds = tabs.compactMap { $0["id"] as? String }
            tabBar.items = tabs.enumerated().map { index, tab in
                let symbol = tab["symbol"] as? String ?? "circle"
                let size = UIImage.SymbolConfiguration(pointSize: 17, weight: .regular, scale: .medium)
                let item = UITabBarItem(
                    title: tab["title"] as? String,
                    image: UIImage(systemName: symbol, withConfiguration: size),
                    selectedImage: UIImage(systemName: "\(symbol).fill", withConfiguration: size)
                        ?? UIImage(systemName: symbol, withConfiguration: size)
                )
                item.tag = index

                return item
            }

            self.select(id: call.getString("selected"))
            tabBar.superview?.layoutIfNeeded()
            call.resolve(["height": tabBar.frame.height])
        }
    }

    @objc func select(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.select(id: call.getString("id"))
            call.resolve()
        }
    }

    @objc func setVisible(_ call: CAPPluginCall) {
        let isVisible = call.getBool("visible") ?? true

        DispatchQueue.main.async {
            guard let tabBar = self.tabBar else {
                call.resolve()
                return
            }

            if isVisible {
                tabBar.isHidden = false
            }

            UIView.animate(withDuration: 0.25, delay: 0, options: [.beginFromCurrentState, .curveEaseInOut]) {
                tabBar.alpha = isVisible ? 1 : 0
                tabBar.transform = isVisible ? .identity : CGAffineTransform(translationX: 0, y: tabBar.frame.height)
            } completion: { isFinished in
                if isFinished && !isVisible {
                    tabBar.isHidden = true
                }
            }

            call.resolve()
        }
    }

    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard tabIds.indices.contains(item.tag) else {
            return
        }

        notifyListeners("tabSelected", data: ["id": tabIds[item.tag]])
    }

    private func select(id: String?) {
        guard let tabBar = tabBar, let id = id, let index = tabIds.firstIndex(of: id) else {
            return
        }

        tabBar.selectedItem = tabBar.items?[index]
    }

    private func makeTabBar() -> UITabBar {
        let tabBar = UITabBar()
        tabBar.delegate = self
        tabBar.tintColor = UIColor(red: 0.376, green: 0.384, blue: 0.667, alpha: 1)
        tabBar.translatesAutoresizingMaskIntoConstraints = false

        if let view = bridge?.viewController?.view {
            view.addSubview(tabBar)
            NSLayoutConstraint.activate([
                tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            ])
        }

        self.tabBar = tabBar

        return tabBar
    }
}
