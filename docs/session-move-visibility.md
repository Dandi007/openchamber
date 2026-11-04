# Chats 会话迁移后的可见性

## 需求与决策

用户于 2026-11-04 确认：Chats 会话改变工作目录后继续显示在 Chats，直到用户通过已有的“移到项目”操作明确改变归属。运行目录始终使用 OpenCode 的当前值。

v2.5.1 按当前目录判断 Chats；迁往未添加的仓库后，会话退出 Chats，也无法匹配项目分组。最小复现中，可见数量由 1 变成 0。消息和运行状态仍存在。

## 设计

会话 metadata 的 `openchamber.sidebar` 保存 `chats` 或 `project`。新建托管 Chats 时随创建请求写入 `chats`。普通目录迁移保留 metadata，刷新与其他客户端从同一 OpenCode 记录恢复归属。缺少属性的旧记录继续按目录分类，未知属性也按旧规则处理。

共享列表分类、Chats 缓存、移动端列表与 Header 使用同一判断。文件访问、消息发送、目录同步和删除目录仍使用真实目录；显示归属不能授予删除项目目录的权限。

显式“移到项目”完成目录迁移后，将整个会话树标记为 `project`，根会话最后写入。写入失败继续显示原 Chats 入口并报告失败；目录可能已迁移，允许在同一目录重试归属保存。失败不会删除数据或静默报告成功。复用现有串行 metadata merge-patch 服务，保留其他字段。

旧版创建的会话通过一次性修复清单迁移：仅对创建记录证明来自托管 Chats、且没有显式归属的记录补 `chats`。先保存清单和原 metadata，通过既有 metadata API 写入；不直接写 SQLite，不读取 reasoning 内容。历史上曾手动移到项目的记录不能仅按创建目录自动判断，需排除或人工确认。本次事故会话有明确 agent 工具调用证据。

## 适用端与成本

| Runtime | 行为 |
|---|---|
| Web | Chats 归属跨目录迁移与刷新保留，现有移到项目入口可用 |
| Electron | 复用共享列表与 Header，无 native 改动 |
| VS Code | 保留原有 workspace 范围；托管 Chats 仍不进入列表 |
| Hosted mobile | 共享 Chats 分类与 metadata；不新增操作入口 |
| Capacitor mobile | 同 Hosted mobile，使用现有网络通道 |

仅在列表分类时读取一个 metadata 属性，复杂度仍为 O(N)。不新增轮询、历史扫描或每条消息的网络请求。新建会话仍为一次 create 请求，用户主动移到项目才增加每个会话一次 metadata 更新。

## 验收

- Chats 迁到未添加的项目后仍在 Chats，消息与发送目录为目标目录。
- JSON 持久化往返、刷新重载、重复迁移仍保持归属。
- 普通项目会话、归档、临时 btw 与 VS Code 范围保持原有规则。
- 用户显式移到项目后退出 Chats；目录迁移失败不改变归属；metadata 保存失败可重试，其他字段保留。
- 运行相关回归测试、`bun run check:changed -- --base v2.5.1` 与 Web build；隔离 Web 验证列表、迁移、刷新。

## 部署与发布条件

基线为生产 v2.5.1 / 3e9ef4db。代码在独立 worktree 与用户 fork 的 PR 中交付，测试通过后 ready。发布前保存当前 release 指针与会话修复清单，使用构建产物发布；回滚切回旧 release。旧版忽略新增 metadata，消息与目录均可继续使用，但旧版的迁移可见性缺口仍存在。

生产发布与 metadata 回填单独记录实际执行结果，PR ready 不代表已经上线。
