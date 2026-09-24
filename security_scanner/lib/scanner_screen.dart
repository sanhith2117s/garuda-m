import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:ui';
import 'app_state.dart';

class ScannerScreen extends StatefulWidget {
  final String mode;
  final String? lunchAction, customAction;
  final Map<String, dynamic>? passType;
  const ScannerScreen({super.key, required this.mode, this.lunchAction, this.passType, this.customAction});
  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with TickerProviderStateMixin {
  bool _scanning = true;
  bool _loading = false;
  String _status = 'Align QR code within the frame';
  late final AnimationController _lineCtrl;

  Color get _color => AppTheme.modeColor(widget.mode);
  List<Color> get _gradient => [_color, _color.withOpacity(0.7)];

  String get _modeLabel {
    switch (widget.mode) {
      case 'instant': return 'GATE PASS';
      case 'lunch': return 'LUNCH ${(widget.lunchAction ?? '').toUpperCase()}';
      case 'late': return 'LATE ENTRY';
      case 'custom_pass': return '${widget.passType?['name'] ?? 'CUSTOM'} — ${(widget.customAction ?? 'OUT').toUpperCase()}';
      default: return 'SCAN';
    }
  }

  @override
  void initState() {
    super.initState();
    _lineCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  }

  @override
  void dispose() { _lineCtrl.dispose(); super.dispose(); }

  void _onDetect(BarcodeCapture capture) {
    if (!_scanning) return;
    for (final b in capture.barcodes) {
      if (b.rawValue != null) {
        setState(() => _scanning = false);
        _process(b.rawValue!);
        break;
      }
    }
  }

  String _extractId(String raw) {
    try {
      final j = jsonDecode(raw);
      return (j['admn_no'] ?? j['htno'] ?? j['roll_number'] ?? raw).toString();
    } catch (_) {}

    // Check for explicit key-value pairs (e.g. htno:245525733187, admn_no:12623)
    final parts = raw.split(RegExp(r'[,-]'));
    for (var p in parts) {
      final c = p.trim().toLowerCase();
      if (c.startsWith('htno:') || c.startsWith('admn_no:') || c.startsWith('roll_number:') || c.startsWith('roll:') || c.startsWith('admn:')) {
        return p.split(':')[1].trim();
      }
    }
    
    // Support multi-part formats separated by hyphens (-) or commas (,)
    if (parts.length > 1) {
      // First priority: 12-character Roll Number (e.g. 245525733187 or 245324733255)
      for (var p in parts) {
        final val = p.trim().toUpperCase();
        if (RegExp(r'^[A-Z0-9]{12}$').hasMatch(val)) {
          return val;
        }
      }
      // Second priority: 3 to 8 digit Admission Number (e.g. 12623 or 1599)
      for (var p in parts) {
        final val = p.trim();
        if (RegExp(r'^\d{3,8}$').hasMatch(val)) {
          return val;
        }
      }
    }

    return raw.trim();
  }

  Future<void> _process(String raw) async {
    setState(() { _loading = true; _status = 'Verifying…'; });
    try {
      final id = _extractId(raw);
      String endpoint;
      final body = <String, dynamic>{'admn_no': id};
      switch (widget.mode) {
        case 'lunch': endpoint = '/api/gate/lunch-scan'; body['action'] = widget.lunchAction; break;
        case 'late': endpoint = '/api/gate/late-comer'; break;
        case 'custom_pass': endpoint = '/api/gate/custom-pass-scan'; body['pass_type_id'] = widget.passType!['id']; body['action'] = widget.customAction ?? 'out'; break;
        default: endpoint = '/api/gate/scan';
      }
      final res = await http.post(Uri.parse('${AppState.baseUrl}$endpoint'), headers: {'Content-Type': 'application/json'}, body: jsonEncode(body)).timeout(const Duration(seconds: 6));
      final data = jsonDecode(res.body);
      if (mounted) _showResult(data);
    } catch (_) {
      if (!mounted) return;
      setState(() { _loading = false; _status = 'Connection failed — check server IP'; });
      Future.delayed(const Duration(seconds: 3), () { if (mounted) setState(() { _scanning = true; _status = 'Align QR code within the frame'; }); });
    }
  }

  void _showResult(Map<String, dynamic> data) {
    setState(() => _loading = false);
    final isLate = widget.mode == 'late';
    final ok = isLate ? data['found'] == true : data['valid'] == true;
    final status = data['status'] ?? '';
    Color color;
    if (isLate) {
      color = status == 'ok' ? AppTheme.emerald : status == 'warning' ? AppTheme.amber : AppTheme.rose;
    } else {
      color = ok ? AppTheme.emerald : AppTheme.rose;
    }

    showGeneralDialog(
      context: context, barrierDismissible: false,
      pageBuilder: (_, __, ___) => const SizedBox(),
      transitionBuilder: (ctx, a, _, __) {
        final curved = CurvedAnimation(parent: a, curve: Curves.easeOutBack);
        return SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero).animate(curved),
          child: _ResultDialog(data: data, color: color, ok: ok, mode: widget.mode, baseUrl: AppState.baseUrl,
            onContinue: () { Navigator.pop(ctx); setState(() { _scanning = true; _status = 'Align QR code within the frame'; }); }),
        );
      },
    );
  }

  void _showSearchDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: AlertDialog(
            backgroundColor: Colors.white.withOpacity(0.95),
            elevation: 10,
            shadowColor: Colors.black.withOpacity(0.2),
            surfaceTintColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            title: Row(
              children: [
                Icon(Icons.search_rounded, color: _color, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Search Student',
                  style: TextStyle(fontWeight: FontWeight.w900, color: AppTheme.textPrimary),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enter Roll Number:',
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: controller,
                  autofocus: true,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    hintText: 'e.g. 24BD1A050A',
                    hintStyle: TextStyle(color: AppTheme.textSecondary.withOpacity(0.5)),
                    filled: true,
                    fillColor: Colors.black.withOpacity(0.05),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: _color, width: 2),
                    ),
                  ),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppTheme.textPrimary),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
              ),
              ElevatedButton(
                onPressed: () {
                  final text = controller.text.trim().toUpperCase();
                  if (text.isNotEmpty) {
                    Navigator.pop(ctx);
                    setState(() => _scanning = false);
                    _process(text);
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _color,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Search', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          MobileScanner(onDetect: _onDetect),
          // Dark overlay with hole
          _ScanOverlay(color: _color),
          // Animated scan line inside frame
          Align(
            alignment: Alignment.center,
            child: SizedBox(
              width: 250,
              height: 250,
              child: AnimatedBuilder(
                animation: _lineCtrl,
                builder: (_, __) => Align(
                  alignment: Alignment(_lineCtrl.value * 2 - 1, 0),
                  child: Container(
                    width: 3,
                    height: 250,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [_color.withOpacity(0), _color, _color.withOpacity(0)],
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Back button
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    color: Colors.white12,
                    child: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Search button next to Back button
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 84,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: GestureDetector(
                  onTap: _showSearchDialog,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    color: Colors.white12,
                    child: const Icon(
                      Icons.search_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Mode pill
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            right: 16,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: _gradient),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _modeLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Status bar
          Positioned(
            bottom: 50,
            left: 20,
            right: 20,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  color: Colors.black38,
                  child: Row(
                    children: [
                      if (_loading)
                        Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: _color,
                            ),
                          ),
                        ),
                      Expanded(
                        child: Text(
                          _status,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanOverlay extends StatelessWidget {
  final Color color;
  const _ScanOverlay({required this.color});
  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      ColorFiltered(
        colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.55), BlendMode.srcOut),
        child: Stack(children: [
          Container(decoration: const BoxDecoration(color: Colors.black, backgroundBlendMode: BlendMode.dstOut)),
          Align(alignment: Alignment.center, child: Container(width: 250, height: 250, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(32)))),
        ]),
      ),
      Align(alignment: Alignment.center,
        child: CustomPaint(painter: _FramePainter(color: color), child: const SizedBox(width: 250, height: 250))),
    ]);
  }
}

class _FramePainter extends CustomPainter {
  final Color color;
  _FramePainter({required this.color});
  @override
  void paint(Canvas canvas, Size s) {
    final p = Paint()..color = color..strokeWidth = 5..style = PaintingStyle.stroke..strokeCap = StrokeCap.round;
    const l = 44.0; const r = 32.0;
    canvas.drawPath(Path()..moveTo(0, l)..lineTo(0, r)..arcToPoint(Offset(r, 0), radius: const Radius.circular(r))..lineTo(l, 0), p);
    canvas.drawPath(Path()..moveTo(s.width - l, 0)..lineTo(s.width - r, 0)..arcToPoint(Offset(s.width, r), radius: const Radius.circular(r))..lineTo(s.width, l), p);
    canvas.drawPath(Path()..moveTo(0, s.height - l)..lineTo(0, s.height - r)..arcToPoint(Offset(r, s.height), radius: const Radius.circular(r), clockwise: false)..lineTo(l, s.height), p);
    canvas.drawPath(Path()..moveTo(s.width - l, s.height)..lineTo(s.width - r, s.height)..arcToPoint(Offset(s.width, s.height - r), radius: const Radius.circular(r), clockwise: false)..lineTo(s.width, s.height - l), p);
  }
  @override bool shouldRepaint(_) => false;
}

class _ResultDialog extends StatelessWidget {
  final Map<String, dynamic> data;
  final Color color;
  final bool ok;
  final String mode, baseUrl;
  final VoidCallback onContinue;
  const _ResultDialog({required this.data, required this.color, required this.ok, required this.mode, required this.baseUrl, required this.onContinue});

  String _getShortCollege(Map<String, dynamic> d) {
    final roll = (d['roll_number'] ?? d['htno'] ?? '').toString().toUpperCase();
    if (roll.length >= 4 && roll.substring(2, 4) == '53') return 'NGIT';
    if (roll.length >= 4 && roll.substring(2, 4) == '55') return 'KMEC';
    final name = (d['college_code'] ?? d['college_name'] ?? d['college'] ?? '').toString().toUpperCase();
    if (name.contains('NEIL') || name.contains('NGIT')) return 'NGIT';
    return 'KMEC';
  }

  String _cleanMessage(String raw) {
    if (raw.startsWith('Valid pass for')) {
      return 'Valid Pass • Exit Allowed';
    }
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final passName = data['pass_name'] as String?;
    final statusIcon = ok ? Icons.check_circle_rounded : (data['status'] == 'warning' ? Icons.warning_rounded : Icons.cancel_rounded);
    final collegeCode = _getShortCollege(data);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GestureDetector(
        onTap: onContinue,
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              color: Colors.white.withOpacity(0.88),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(children: [
                    const Spacer(),
                    // Photo
                    Container(
                      decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: [BoxShadow(color: color.withOpacity(0.4), blurRadius: 40, spreadRadius: 4)]),
                      child: Stack(alignment: Alignment.bottomRight, children: [
                        Container(width: 130, height: 130, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: color, width: 4)),
                          child: ClipOval(child: Image.network('$baseUrl${data['photo_url'] ?? ''}', fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: AppTheme.surfaceLight, child: const Icon(Icons.person_rounded, size: 70, color: AppTheme.textSecondary))))),
                        Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: color, shape: BoxShape.circle, border: Border.all(color: Colors.black, width: 3)),
                          child: Icon(statusIcon, color: Colors.white, size: 26)),
                      ]),
                    ),
                    const SizedBox(height: 20),
                    Text(data['student_name'] ?? 'Unknown', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 26, fontWeight: FontWeight.w900), textAlign: TextAlign.center),
                    const SizedBox(height: 4),
                    Text(data['roll_number'] ?? data['admn_no'] ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 15, letterSpacing: 2, fontFamily: 'monospace', fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text('College: $collegeCode', style: const TextStyle(color: AppTheme.emerald, fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                    if (passName != null) ...[
                      const SizedBox(height: 10),
                      Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(color: AppTheme.purple.withOpacity(0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: AppTheme.purple.withOpacity(0.3))),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.key_rounded, color: AppTheme.purple, size: 16),
                          const SizedBox(width: 6),
                          Text(passName, style: const TextStyle(color: AppTheme.purple, fontWeight: FontWeight.bold)),
                        ])),
                    ],
                    const SizedBox(height: 20),
                    // Highlighted Status Callout
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: color.withOpacity(0.25), width: 1.5),
                      ),
                      child: Text(
                        _cleanMessage(data['message'] ?? (ok ? 'Valid Pass' : 'Invalid Pass')),
                        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(width: double.infinity, child: ElevatedButton(
                      onPressed: onContinue,
                      style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white, elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                      child: const Text('Continue Scanning', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    )),
                    const SizedBox(height: 12),
                    const Text('or tap anywhere to continue', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                    const Spacer(),
                  ]),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
