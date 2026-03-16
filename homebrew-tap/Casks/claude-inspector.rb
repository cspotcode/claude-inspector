cask "claude-inspector" do
  version "1.1.4"

  on_arm do
    url "https://github.com/kangraemin/claude-inspector/releases/download/v#{version}/Claude-Inspector-#{version}-arm64.dmg"
    sha256 "e6ce398f6a5fdad1290bf96e72361cb03f224f4c782821d3c7986ac3d226a65c"
  end
  on_intel do
    url "https://github.com/kangraemin/claude-inspector/releases/download/v#{version}/Claude-Inspector-#{version}-x64.dmg"
    sha256 "4396c8a1e8e7aaa01b5cff3eeb69398a06aace2bf4b980e45048faed448cc223"
  end

  name "Claude Inspector"
  desc "Claude Code Prompt Mechanism Visualizer"
  homepage "https://github.com/kangraemin/claude-inspector"
  app "Claude Inspector.app"

  zap trash: [
    "~/Library/Application Support/Claude Inspector",
    "~/Library/Preferences/com.claudeinspector.app.plist",
    "~/Library/Caches/com.claudeinspector.app",
  ]
end
