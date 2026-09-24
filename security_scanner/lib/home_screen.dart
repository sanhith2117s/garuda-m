import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_state.dart';
import 'scanner_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _staggerCtrl;

  static const _modes = [
    {'mode': 'instant',     'title': 'Gate Pass',    'subtitle': 'Verify pre-approved leaves', 'icon': Icons.shield_rounded, 'color': AppTheme.blue},
    {'mode': 'lunch',       'title': 'Lunch Scan',   'subtitle': 'Manage lunch time entries',  'icon': Icons.restaurant_rounded, 'color': AppTheme.saffron},
    {'mode': 'late',        'title': 'Late Entry',   'subtitle': 'Record delayed arrivals',    'icon': Icons.timer_rounded, 'color': AppTheme.rose},
    {'mode': 'custom_pass', 'title': 'Custom Pass',  'subtitle': 'Special access & clubs',     'icon': Icons.key_rounded, 'color': AppTheme.purple},
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ));
    _staggerCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _staggerCtrl.forward();
    _refresh();
  }

  @override
  void dispose() {
    _staggerCtrl.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    await AppState.fetchPassTypes();
    if (mounted) setState(() {});
  }

  void _navScan(String mode, {String? lunchAction, Map<String, dynamic>? passType, String? customAction}) {
    Navigator.push(context, PageRouteBuilder(
      pageBuilder: (_, a, __) => ScannerScreen(mode: mode, lunchAction: lunchAction, passType: passType, customAction: customAction),
      transitionsBuilder: (_, a, __, child) => FadeTransition(
        opacity: CurvedAnimation(parent: a, curve: Curves.easeOut),
        child: child,
      ),
    ));
  }

  void _onTap(String mode) {
    if (mode == 'lunch') {
      _showSheet(_DirectionSheet(title: 'Lunch Scan', sub: 'Select scanning direction', mode: 'lunch',
          onSelect: (a) { Navigator.pop(context); _navScan('lunch', lunchAction: a); }));
    } else if (mode == 'custom_pass') {
      if (AppState.passTypes.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('No custom passes available. Connect to server first.', style: TextStyle(color: Colors.white)),
          backgroundColor: AppTheme.textPrimary, behavior: SnackBarBehavior.floating,
        ));
        return;
      }
      _showSheet(_PassTypeSheet(onSelect: (pt) { Navigator.pop(context);
        _showSheet(_DirectionSheet(title: pt['name']?.toString() ?? 'Custom Pass',
            sub: '${pt['out_time']} → ${pt['in_time']}', mode: 'custom_pass',
            onSelect: (a) { Navigator.pop(context); _navScan('custom_pass', passType: pt, customAction: a); }));
      }));
    } else {
      _navScan(mode);
    }
  }

  void _showSheet(Widget sheet) {
    showModalBottomSheet(
      context: context, isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => sheet,
    );
  }

  void _showServerConfigDialog() {
    final controller = TextEditingController(text: AppState.baseUrl);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Row(
            children: [
              Icon(Icons.dns_rounded, color: AppTheme.blue),
              SizedBox(width: 10),
              Text('Server Settings', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enter your local server URL:',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                decoration: InputDecoration(
                  hintText: 'http://192.168.1.111:8000',
                  filled: true,
                  fillColor: AppTheme.surfaceLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.link_rounded),
                ),
                keyboardType: TextInputType.url,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () async {
                final newUrl = controller.text.trim();
                if (newUrl.isNotEmpty) {
                  Navigator.pop(context);
                  await AppState.setBaseUrl(newUrl);
                  await _refresh();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.blue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('SAVE & RECONNECT', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: Stack(
        children: [
          // ── Creative Ambient Mesh & Grid Background ──
          Positioned.fill(
            child: CustomPaint(painter: _CreativeBackgroundPainter()),
          ),
          
          SafeArea(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Header with PROMINENT Brand Logo
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Padded emblem logo with beautifully formatted manual text
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Hero(
                          tag: 'app_logo',
                          child: Image.asset(
                            'assets/logo.png',
                            height: 46, // Elegant emblem size
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'GARUDA',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                    
                    // Server Status / KMIT Configuration Pill
                    GestureDetector(
                      onLongPress: _showServerConfigDialog,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(100),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
                          border: Border.all(color: Colors.black12, width: 0.5),
                        ),
                        child: Row(children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppState.isOnline ? AppTheme.emerald : AppTheme.rose,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: (AppState.isOnline ? AppTheme.emerald : AppTheme.rose).withOpacity(0.4),
                                  blurRadius: 4,
                                )
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text('GARUDA', style: TextStyle(color: AppTheme.textPrimary, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 10),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Text('Operation Modes', style: TextStyle(color: AppTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
              ),
              const SizedBox(height: 24),

              // Elevated, Staggered Cards
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                  itemCount: _modes.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 20),
                  itemBuilder: (context, i) {
                    final m = _modes[i];
                    final mode = m['mode'] as String;
                    final color = m['color'] as Color;
                    String sub = m['subtitle'] as String;
                    if (mode == 'custom_pass' && AppState.passTypes.isNotEmpty) sub = '${AppState.passTypes.length} active passes';
                    
                    final anim = CurvedAnimation(
                      parent: _staggerCtrl,
                      curve: Interval(i * 0.15, 1.0, curve: Curves.easeOutCubic),
                    );

                    return AnimatedBuilder(
                      animation: anim,
                      builder: (context, child) {
                        return Transform.translate(
                          offset: Offset(0, 50 * (1 - anim.value)),
                          child: Opacity(
                            opacity: anim.value,
                            child: _ElevatedCard(
                              title: m['title'] as String, subtitle: sub,
                              icon: m['icon'] as IconData, color: color,
                              onTap: () => _onTap(mode),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── Creative Background Painter for Premium Ambient Aesthetics ──
class _CreativeBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw base soft linear gradient background
    final bgPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white,
          Color(0xFFF8FAFC),
        ],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, bgPaint);

    // 2. Draw ambient saffron glow in top right
    final saffronGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          AppTheme.saffron.withOpacity(0.05),
          AppTheme.saffron.withOpacity(0),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * 0.9, size.height * 0.1),
        radius: size.width * 0.55,
      ));
    canvas.drawCircle(Offset(size.width * 0.9, size.height * 0.1), size.width * 0.55, saffronGlow);

    // 3. Draw ambient blue glow in middle left
    final blueGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          AppTheme.blue.withOpacity(0.04),
          AppTheme.blue.withOpacity(0),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * 0.1, size.height * 0.45),
        radius: size.width * 0.65,
      ));
    canvas.drawCircle(Offset(size.width * 0.1, size.height * 0.45), size.width * 0.65, blueGlow);

    // 4. Draw ambient purple glow in bottom right
    final purpleGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          AppTheme.purple.withOpacity(0.05),
          AppTheme.purple.withOpacity(0),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * 0.85, size.height * 0.85),
        radius: size.width * 0.7,
      ));
    canvas.drawCircle(Offset(size.width * 0.85, size.height * 0.85), size.width * 0.7, purpleGlow);

    // 5. Draw elegant, high-tech dotted grid pattern (dot-matrix)
    final dotPaint = Paint()
      ..color = AppTheme.textPrimary.withOpacity(0.035)
      ..style = PaintingStyle.fill;
    
    const double spacing = 28.0;
    for (double x = spacing / 2; x < size.width; x += spacing) {
      for (double y = spacing / 2; y < size.height; y += spacing) {
        final centerDist = Offset(size.width / 2, size.height / 2);
        final pt = Offset(x, y);
        final dist = (pt - centerDist).distance;
        final maxDist = size.shortestSide * 0.9;
        final factor = (1.0 - (dist / maxDist)).clamp(0.2, 1.0);
        
        canvas.drawCircle(pt, 1.3 * factor, dotPaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ── Elevated Interactive Card with Micro-Animations ─────────────────────────
class _ElevatedCard extends StatefulWidget {
  final String title, subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ElevatedCard({required this.title, required this.subtitle, required this.icon, required this.color, required this.onTap});

  @override
  State<_ElevatedCard> createState() => _ElevatedCardState();
}

class _ElevatedCardState extends State<_ElevatedCard> with SingleTickerProviderStateMixin {
  late final AnimationController _pressCtrl;
  late final Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _pressCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 120));
    _scaleAnim = Tween<double>(begin: 1.0, end: 0.96).animate(CurvedAnimation(parent: _pressCtrl, curve: Curves.easeInOutCubic));
  }

  @override
  void dispose() {
    _pressCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnim,
      child: GestureDetector(
        onTapDown: (_) => _pressCtrl.forward(),
        onTapUp: (_) {
          _pressCtrl.reverse();
          widget.onTap();
        },
        onTapCancel: () => _pressCtrl.reverse(),
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: widget.color.withOpacity(0.06),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.015),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
            border: Border.all(color: Colors.white, width: 1.5),
          ),
          child: Stack(
            children: [
              // Large faint background icon emblem for that premium touch
              Positioned(
                right: -15,
                bottom: -15,
                child: Icon(
                  widget.icon,
                  size: 110,
                  color: widget.color.withOpacity(0.03),
                ),
              ),
              
              // Left vertical accent stripe to frame the card beautifully
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 6,
                child: Container(
                  decoration: BoxDecoration(
                    color: widget.color,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(24),
                      bottomLeft: Radius.circular(24),
                    ),
                  ),
                ),
              ),
              
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 20, 20),
                child: Row(
                  children: [
                    // Premium Icon container
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: widget.color.withOpacity(0.09),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: widget.color.withOpacity(0.12), width: 1),
                      ),
                      child: Icon(widget.icon, color: widget.color, size: 28),
                    ),
                    const SizedBox(width: 18),
                    
                    // Text info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.4,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.subtitle,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    // Chevron action indicator
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: widget.color.withOpacity(0.05),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.arrow_forward_ios_rounded, color: widget.color.withOpacity(0.8), size: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Pass Type Sheet ───────────────────────────────────────────────────────────
class _PassTypeSheet extends StatelessWidget {
  final Function(Map<String, dynamic>) onSelect;
  const _PassTypeSheet({required this.onSelect});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      child: SafeArea(top: false, child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 12),
        Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(2))),
        const Padding(padding: EdgeInsets.fromLTRB(24, 24, 24, 6),
          child: Row(children: [
            Icon(Icons.key_rounded, color: AppTheme.purple, size: 20),
            SizedBox(width: 10),
            Text('Custom Passes', style: TextStyle(color: AppTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
          ])),
        ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
          child: ListView.separated(
            shrinkWrap: true, padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            itemCount: AppState.passTypes.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) {
              final pt = AppState.passTypes[i];
              return ListTile(
                onTap: () => onSelect(pt),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Colors.black12)),
                tileColor: AppTheme.bg,
                title: Text(pt['name']?.toString() ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text('${pt['out_time']} → ${pt['in_time']}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14, fontWeight: FontWeight.w600)),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.textSecondary, size: 16),
              );
            },
          ),
        ),
      ])),
    );
  }
}

// ── Direction Sheet ───────────────────────────────────────────────────────────
class _DirectionSheet extends StatelessWidget {
  final String title, sub, mode;
  final Function(String) onSelect;
  const _DirectionSheet({required this.title, required this.sub, required this.mode, required this.onSelect});
  @override
  Widget build(BuildContext context) {
    final color = AppTheme.modeColor(mode);
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      child: SafeArea(top: false, child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 24), decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(2))),
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),
          child: Icon(Icons.sync_alt_rounded, color: color, size: 32)),
        const SizedBox(height: 16),
        Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 24, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text(sub, style: const TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.w600, fontSize: 15)),
        const SizedBox(height: 32),
        Row(children: [
          Expanded(child: _DirBtn('OUT', Icons.logout_rounded, AppTheme.blue, () => onSelect('out'))),
          const SizedBox(width: 16),
          Expanded(child: _DirBtn('IN', Icons.login_rounded, AppTheme.emerald, () => onSelect('in'))),
        ]),
      ])),
    );
  }

  Widget _DirBtn(String label, IconData icon, Color c, VoidCallback onTap) {
    return GestureDetector(onTap: onTap, child: Container(padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(color: AppTheme.bg, border: Border.all(color: Colors.black12), borderRadius: BorderRadius.circular(24)),
      child: Column(children: [
        Icon(icon, color: c, size: 32),
        const SizedBox(height: 12),
        Text(label, style: TextStyle(color: c, fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: 1.5)),
      ]),
    ));
  }
}
