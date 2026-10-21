include("TestLCSU.js");
include("Tektronix.js");

lcsu_print = 0;
tek_wait_log = 0;

// Цепь: LCSU — ECH381V/EC381V — EK500BD — шунт 250 мкОм.
// Один канал TPS2024 — ток (падение на шунте), два других — напряжение на каждой нагрузке.
// Импульс трапеции запускается программно: LCSU_Start(). Контактора и синхроимпульса нет.
// Амплитуда — среднее по полке: она растянута на экран, значение берётся из слотов meas1..meas3.
// Loads_Pulse берёт масштаб каналов напряжения из Loads_Rexpect_ECH и Loads_Rexpect_EK.
// Пять импульсов подбора — только в Loads_ResourceTest, до включения периода.
// Loads_Autoscale = 0 — и в ресурсном тесте оставить ручные Loads_Rexpect.
//
// Loads_Rexpect_ECH = 0.001; // Ом, масштаб канала ECH
// Loads_Rexpect_EK  = 0.001;
// Loads_Init(portLCSU, portTek, chCurrent, chECH, chEK);
// Loads_Pulse(1000, 10);
// Loads_ResourceTest(1000, 10, 1);

Loads_Rshunt = 0.00025;			// Ом, шунт тока
Loads_Rexpect_ECH = 0.0072;		// Ом, масштаб канала ECH в Loads_Pulse
Loads_Rexpect_EK = 0.00332;		// Ом, масштаб канала EK в Loads_Pulse
Loads_Autoscale = 1;			// 1 — подобрать масштаб перед ресурсным тестом
Loads_AutoscaleSteps = 5;		// импульсов подбора: первый ток в столько же раз меньше задания
Loads_AutoscaleMinCurrent = 50;	// А, ниже этого ток подбора не опускается
Loads_Rstart = 0.01;			// Ом, 10 мОм — первая оценка сопротивления до измерения
Loads_NameECH = "ECH381V/EC381V";
Loads_NameEK = "EK500BD";

Loads_PulseType = 2;			// 0 — синус, 1 — мод. синус, 2 — трапеция
Loads_TriggerFraction = 0.5;	// уровень триггера, доля амплитуды тока
Loads_MeanMargin = 0.2;			// доля полки, отступаемая с каждого края
Loads_Probe = "1";				// канал тока, прямой вход на шунт
Loads_ProbeVoltage = "10";		// делитель каналов падения напряжения
Loads_LCSU_Nid = 0;				// 0 — не выбирать узел; для CAN, например, 110

PulsesInASeries = 1;
SeriesPauseSeconds = 0;
DelayBetweenSeriesSeconds = 4;
ResourceTestHours = 8;

Loads_Oscilloscope = 1;
Loads_BaseCount = 10;			// первые импульсы, их среднее — начальное сопротивление

loads_chCurrent = 2;
loads_chECH = 1;
loads_chEK = 3;
loads_counter = 1;
loads_csvReady = 0;
loads_tableReady = 0;
loads_rSumECH = 0;
loads_rSumEK = 0;
loads_rCount = 0;
loads_rBaseECH = 0;
loads_rBaseEK = 0;
loads_didtWarned = 0;
loads_tCenter = 0;
loads_meanReady = 0;
loads_scopeKey = "";
loads_fitKey = "";
loads_portLCSU = 0;
loads_fsI = 1;
loads_fsECH = 1;
loads_fsEK = 1;

function Loads_OpenLCSU()
{
	for (var n = 0; n < 3; n++)
	{
		try { dev.Disconnect(); }
		catch (e) {}

		sleep(300);
		dev.Connect(loads_portLCSU);
		if (Loads_LCSU_Nid > 0)
			dev.nid(Loads_LCSU_Nid);
		sleep(300);

		try
		{
			dev.r(192);
			return 1;
		}
		catch (e)
		{
			print("LCSU: нет связи, повтор открытия порта " + loads_portLCSU);
		}
	}

	print("LCSU: порт " + loads_portLCSU + " не отвечает");
	return 0;
}

function Loads_LCSUAlive()
{
	try
	{
		dev.r(192);
		return 1;
	}
	catch (e)
	{
		return 0;
	}
}

function Loads_Init(portLCSU, portTek, channelCurrent, channelECH, channelEK)
{
	if (channelCurrent < 1 || channelCurrent > 4 || channelECH < 1 || channelECH > 4 || channelEK < 1 || channelEK > 4)
	{
		print("Номер канала осциллографа: 1..4");
		return 0;
	}

	if (channelCurrent == channelECH || channelCurrent == channelEK || channelECH == channelEK)
	{
		print("Каналы тока и двух напряжений должны быть разными");
		return 0;
	}

	loads_chCurrent = channelCurrent;
	loads_chECH = channelECH;
	loads_chEK = channelEK;
	loads_csvReady = 0;
	loads_tableReady = 0;
	loads_rSumECH = 0;
	loads_rSumEK = 0;
	loads_rCount = 0;
	loads_rBaseECH = 0;
	loads_rBaseEK = 0;
	loads_didtWarned = 0;
	loads_meanReady = 0;
	loads_scopeKey = "";
	loads_fitKey = "";

	loads_portLCSU = portLCSU;
	if (!Loads_OpenLCSU())
		return 0;

	TEK_PortInit(portTek);
	TEK_AcquireSample();
	TEK_ChannelInit(loads_chCurrent, Loads_Probe, "1");
	TEK_ChannelInit(loads_chECH, Loads_ProbeVoltage, "1");
	TEK_ChannelInit(loads_chEK, Loads_ProbeVoltage, "1");

	for (var i = 1; i <= 4; i++)
	{
		if (i == loads_chCurrent || i == loads_chECH || i == loads_chEK)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	print("LCSU, порт " + portLCSU);
	print("TPS2024, порт " + portTek);
	print("CH" + loads_chCurrent + " ток, шунт " + (Loads_Rshunt * 1e6) + " мкОм");
	print("CH" + loads_chECH + " " + Loads_NameECH);
	print("CH" + loads_chEK + " " + Loads_NameEK);
	return 1;
}

// Длительность фронта, с. Регистр 17 — di/dt, А/мкс.
function Loads_Front_s(Current)
{
	var didt = dev.rf(17);
	if (!didt || didt <= 0)
	{
		if (!loads_didtWarned)
		{
			print("Регистр 17 (di/dt) пуст, полка отсчитывается от триггера");
			loads_didtWarned = 1;
		}
		return 0;
	}

	return Current / didt * 1e-6;
}

// Ноль канала внизу экрана: ожидаемая амплитуда — 4 деления, сверху остаётся запас.
function Loads_ApplyScale(Channel, Amplitude)
{
	var perDiv = Amplitude / 4;
	if (perDiv < 0.002)
		perDiv = 0.002;

	TEK_Send("ch" + Channel + ":scale " + perDiv.toExponential(3));
	return perDiv * 8;
}

function Loads_ProgramScope(Current, Pulse_ms)
{
	var tFront = Loads_Front_s(Current);
	var tPulse = Pulse_ms * 1e-3;
	var tFlat = (1 - Loads_TriggerFraction) * tFront;
	var uShunt = Current * Loads_Rshunt;

	TEK_StopAcquire();
	loads_fsI = Loads_ApplyScale(loads_chCurrent, uShunt);
	loads_fsECH = Loads_ApplyScale(loads_chECH, Current * Loads_Rexpect_ECH);
	loads_fsEK = Loads_ApplyScale(loads_chEK, Current * Loads_Rexpect_EK);

	var tMeas = tPulse * (1 - 2 * Loads_MeanMargin);
	if (tMeas < tPulse * 0.5)
		tMeas = tPulse * 0.5;

	loads_tCenter = tFlat + tPulse * 0.5;
	var scale = tMeas / 10;
	if (scale < 1e-6)
		scale = 1e-6;

	TEK_Horizontal(scale.toExponential(3), loads_tCenter.toExponential(3));

	if (!loads_meanReady)
	{
		TEK_MeasMeanInit(loads_chCurrent, 1);
		TEK_MeasMeanInit(loads_chECH, 2);
		TEK_MeasMeanInit(loads_chEK, 3);
		loads_meanReady = 1;
	}

	var level = uShunt * Loads_TriggerFraction;
	if (level < 0.001)
		level = 0.001;

	TEK_Send("trigger:main:level " + level.toExponential(3));
	TEK_Send("trigger:main:mode normal");
	TEK_Send("trigger:main:type edge");
	TEK_Send("trigger:main:edge:coupling hfrej");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Send("trigger:main:edge:source ch" + loads_chCurrent);
}

function Loads_Arm(Current, Pulse_ms)
{
	var didt = dev.rf(17);
	var scopeKey = Current + ";" + Pulse_ms + ";" + didt + ";"
		+ Loads_Rshunt + ";" + Loads_Rexpect_ECH + ";" + Loads_Rexpect_EK + ";"
		+ Loads_MeanMargin + ";" + Loads_TriggerFraction + ";"
		+ loads_chCurrent + ";" + loads_chECH + ";" + loads_chEK;

	if (scopeKey != loads_scopeKey)
	{
		Loads_ProgramScope(Current, Pulse_ms);
		loads_scopeKey = scopeKey;
	}

	TEK_ArmSequence();
	TEK_WaitTriggerReady(20, 50);
	return 1;
}

function Loads_ReadMean(Channel)
{
	var slot = 1;
	if (Channel == loads_chECH)
		slot = 2;
	else if (Channel == loads_chEK)
		slot = 3;

	var value = 9.9e37;
	for (var n = 0; n < 10; n++)
	{
		value = TEK_Measure(slot);
		if (!isNaN(value) && Math.abs(value) < 9.9e36)
			return value;
		if (anykey())
			return NaN;
		sleep(50);
	}

	print("Нет среднего, слот " + slot);
	return NaN;
}

function Loads_Clip(Name, Value, FullScale, Hint)
{
	if (Math.abs(Value) > 0.9 * FullScale)
	{
		print(Name + ": " + Value.toFixed(4) + " В у края экрана. " + Hint);
		return 1;
	}

	return 0;
}

function Loads_Save(Line)
{
	if (!loads_csvReady)
	{
		append("data/Loads_ECH_EK.csv", ["N;Time;Iset, A;IdLCSU, A;Ushunt, V;Itek, A;U_ECH, V;U_EK, V;R_ECH, Ohm;R_EK, Ohm;Rsum, Ohm"]);
		loads_csvReady = 1;
	}

	append("data/Loads_ECH_EK.csv", [Line]);
}

function Loads_Cell(Text, Width)
{
	Text = "" + Text;
	while (Text.length < Width)
		Text = " " + Text;
	return Text;
}

function Loads_Clock(Stamp)
{
	var h = Stamp.getHours();
	var m = Stamp.getMinutes();
	var s = Stamp.getSeconds();
	if (h < 10)
		h = "0" + h;
	if (m < 10)
		m = "0" + m;
	if (s < 10)
		s = "0" + s;
	return h + ":" + m + ":" + s;
}

// (текущее − среднее первых Loads_BaseCount) / это среднее, %. Плюс: новое сопротивление выше начального.
function Loads_Drift(CurrentR, Base)
{
	if (Base == 0)
		return "";

	var pct = (CurrentR - Base) / Base * 100;
	var text = pct.toFixed(2);
	if (pct > 0)
		text = "+" + text;
	return text;
}

function Loads_TableRow(Num, Stamp, Iset, IdUnit, Itek, Uech, Uek, Rech, Rek, dECH, dEK)
{
	var cN = 7;
	var cT = 8;
	var cI = 7;
	var cU = 6;
	var cR = 6;
	var cD = 6;
	var head = Loads_Cell("N", cN) + " | " + Loads_Cell("Time", cT) + " | " + Loads_Cell("Iset", cI) + " | " + Loads_Cell("IdLCSU", cI)
		+ " | " + Loads_Cell("Itek", cI) + " | " + Loads_Cell("U ECH", cU) + " | " + Loads_Cell("U EK", cU)
		+ " | " + Loads_Cell("R ECH", cR) + " | " + Loads_Cell("R EK", cR)
		+ " | " + Loads_Cell("dECH", cD) + " | " + Loads_Cell("dEK", cD);
	if (!loads_tableReady)
	{
		var units = Loads_Cell("", cN) + " | " + Loads_Cell("", cT) + " | " + Loads_Cell("A", cI) + " | " + Loads_Cell("A", cI)
			+ " | " + Loads_Cell("A", cI) + " | " + Loads_Cell("V", cU) + " | " + Loads_Cell("V", cU)
			+ " | " + Loads_Cell("mOhm", cR) + " | " + Loads_Cell("mOhm", cR)
			+ " | " + Loads_Cell("%", cD) + " | " + Loads_Cell("%", cD);
		var rule = "";
		for (var i = 0; i < head.length; i++)
			rule = rule + "-";
		print(head);
		print(units);
		print(rule);
		loads_tableReady = 1;
	}

	print(Loads_Cell(Num, cN) + " | " + Loads_Cell(Loads_Clock(Stamp), cT) + " | " + Loads_Cell(Iset, cI) + " | " + Loads_Cell(IdUnit, cI)
		+ " | " + Loads_Cell(Itek, cI) + " | " + Loads_Cell(Uech, cU) + " | " + Loads_Cell(Uek, cU)
		+ " | " + Loads_Cell(Rech, cR) + " | " + Loads_Cell(Rek, cR)
		+ " | " + Loads_Cell(dECH, cD) + " | " + Loads_Cell(dEK, cD));
}

function Loads_ReadPulse(Current, Stamp)
{
	if (!TEK_WaitAcquire(200, 50))
	{
		TEK_StopAcquire();
		print("Осциллограф не захватил импульс");
		return 0;
	}

	if (dev.r(192) == LCSU_DS_Fault)
	{
		PrintStatus();
		return 0;
	}

	if (dev.rf(196) == 1)
	{
		print("Following regulator error.");
		return 0;
	}

	var uShunt = Loads_ReadMean(loads_chCurrent);
	var uECH = Loads_ReadMean(loads_chECH);
	var uEK = Loads_ReadMean(loads_chEK);

	if (isNaN(uShunt) || isNaN(uECH) || isNaN(uEK))
		return 0;

	if (Loads_Clip("Ток", uShunt, loads_fsI, "Проверьте шунт и задание тока."))
		return 0;

	var iTek = uShunt / Loads_Rshunt;
	if (Math.abs(iTek) < 1)
	{
		print("Ток по осциллографу " + iTek.toFixed(3) + " А. Проверьте шунт, полярность и триггер.");
		return 0;
	}

	var rECH = uECH / iTek;
	var rEK = uEK / iTek;
	if (Loads_LoadStop(Loads_NameECH, uECH, loads_fsECH, rECH)
		|| Loads_LoadStop(Loads_NameEK, uEK, loads_fsEK, rEK))
		return 0;
	var rSum = rECH + rEK;
	var idUnit = dev.rf(200);
	var dECH = "";
	var dEK = "";

	if (loads_rCount < Loads_BaseCount)
	{
		loads_rSumECH = loads_rSumECH + rECH;
		loads_rSumEK = loads_rSumEK + rEK;
		loads_rCount++;
		if (loads_rCount == Loads_BaseCount)
		{
			loads_rBaseECH = loads_rSumECH / Loads_BaseCount;
			loads_rBaseEK = loads_rSumEK / Loads_BaseCount;
		}
	}
	else
	{
		dECH = Loads_Drift(rECH, loads_rBaseECH);
		dEK = Loads_Drift(rEK, loads_rBaseEK);
	}

	Loads_TableRow(loads_counter, Stamp, Current.toFixed(2), idUnit.toFixed(2), iTek.toFixed(2),
		uECH.toFixed(4), uEK.toFixed(4), (rECH * 1e3).toFixed(3), (rEK * 1e3).toFixed(3), dECH, dEK);

	Loads_Save(loads_counter + ";" + Stamp + ";" + Current + ";" + idUnit + ";"
		+ uShunt + ";" + iTek + ";" + uECH + ";" + uEK + ";"
		+ rECH + ";" + rEK + ";" + rSum);

	loads_counter++;
	return 1;
}

function Loads_OnePulse(Current, Pulse_ms)
{
	if (anykey())
	{
		print("Остановлено");
		return 8;
	}

	if (Loads_Oscilloscope)
	{
		if (!Loads_Arm(Current, Pulse_ms))
			return 3;
	}

	var stamp = new Date();
	sleep(500)

	lcsu_print = 0;
	if (!Loads_LCSUAlive() && !Loads_OpenLCSU())
		return 2;

	if (!LCSU_Start(Loads_PulseType, Current, Pulse_ms))
	{
		if (Loads_Oscilloscope)
			TEK_StopAcquire();
		return 2;
	}

	if (!Loads_Oscilloscope)
	{
		Loads_TableRow(loads_counter, stamp, Current.toFixed(2), dev.rf(200).toFixed(2), "", "", "", "", "", "");
		loads_counter++;
		return 0;
	}

	if (!Loads_ReadPulse(Current, stamp))
		return 4;

	return 0;
}

function Loads_WaitUntil(UntilMs, Label)
{
	while (Date.now() < UntilMs)
	{
		pinline("\r" + Label + " = " + ((UntilMs - Date.now()) / 1000).toFixed(1) + " с   ");
		if (anykey())
		{
			print("\rОстановлено");
			return 1;
		}
		sleep(100);
	}

	pinline("\r                              \r");
	return 0;
}

// Ток шага подбора: от задания / числа шагов (не ниже 50 А) до самого задания.
function Loads_ScaleCurrent(Target, Step, Steps)
{
	var iStart = Target / Steps;
	if (iStart < Loads_AutoscaleMinCurrent)
		iStart = Loads_AutoscaleMinCurrent;
	if (iStart > Target)
		iStart = Target;
	if (Steps < 2)
		return Target;

	return iStart + (Target - iStart) * Step / (Steps - 1);
}

// 1 — падение ушло за верх экрана или сопротивление выше Loads_Rstart. Расчёт дальше не ведётся.
function Loads_LoadStop(Name, Voltage, FullScale, Resistance)
{
	if (Voltage > 0.9 * FullScale)
	{
		print(Name + ": падение ушло за верх экрана, расчёт сопротивления остановлен");
		return 1;
	}

	if (Resistance < 0)
		Resistance = -Resistance;
	if (Resistance > Loads_Rstart)
	{
		print(Name + ": " + (Resistance * 1e3).toFixed(3) + " мОм выше " + (Loads_Rstart * 1e3) + " мОм, расчёт сопротивления остановлен");
		return 1;
	}

	return 0;
}

// Пять импульсов с ростом тока. После каждого развёртка напряжения ставится по измеренному сопротивлению.
// В таблицу и csv эти импульсы не пишутся. 1 — масштаб выбран.
function Loads_FitVoltage(Current, Pulse_ms)
{
	if (!Loads_Autoscale || !Loads_Oscilloscope)
		return 1;

	var steps = Loads_AutoscaleSteps;
	if (steps < 1)
		steps = 1;

	var key = Current + ";" + Pulse_ms + ";" + steps + ";" + Loads_Rstart;
	if (key == loads_fitKey)
		return 1;

	Loads_Rexpect_ECH = Loads_Rstart;
	Loads_Rexpect_EK = Loads_Rstart;
	loads_scopeKey = "";

	print("Подбор масштаба: " + steps + " импульсов, от "
		+ Loads_ScaleCurrent(Current, 0, steps).toFixed(1) + " А до " + Current + " А, старт "
		+ (Loads_Rstart * 1e3) + " мОм");

	for (var step = 0; step < steps; step++)
	{
		if (anykey())
		{
			print("Остановлено");
			return 0;
		}

		var iSet = Loads_ScaleCurrent(Current, step, steps);
		if (!Loads_Arm(iSet, Pulse_ms))
			return 0;

		sleep(500);
		lcsu_print = 0;
		if (!Loads_LCSUAlive() && !Loads_OpenLCSU())
			return 0;

		if (!LCSU_Start(Loads_PulseType, iSet, Pulse_ms))
		{
			TEK_StopAcquire();
			return 0;
		}

		if (!TEK_WaitAcquire(200, 50))
		{
			TEK_StopAcquire();
			print("Осциллограф не захватил импульс подбора масштаба");
			return 0;
		}

		var uShunt = Loads_ReadMean(loads_chCurrent);
		var uECH = Loads_ReadMean(loads_chECH);
		var uEK = Loads_ReadMean(loads_chEK);
		if (isNaN(uShunt) || isNaN(uECH) || isNaN(uEK))
			return 0;

		var iTek = uShunt / Loads_Rshunt;
		if (Math.abs(iTek) < 1)
		{
			print("Ток по осциллографу " + iTek.toFixed(3) + " А. Подбор масштаба остановлен.");
			return 0;
		}

		var rECH = uECH / iTek;
		var rEK = uEK / iTek;
		if (Loads_LoadStop(Loads_NameECH, uECH, loads_fsECH, rECH)
			|| Loads_LoadStop(Loads_NameEK, uEK, loads_fsEK, rEK))
			return 0;

		if (rECH < 0)
			rECH = -rECH;
		if (rEK < 0)
			rEK = -rEK;
		if (rECH < 1e-5)
			rECH = 1e-5;
		if (rEK < 1e-5)
			rEK = 1e-5;

		Loads_Rexpect_ECH = rECH;
		Loads_Rexpect_EK = rEK;
		loads_scopeKey = "";

		print("Подбор " + (step + 1) + "/" + steps
			+ ", ток " + iSet.toFixed(1) + " А"
			+ ", R ECH " + (Loads_Rexpect_ECH * 1e3).toFixed(3) + " мОм"
			+ ", R EK " + (Loads_Rexpect_EK * 1e3).toFixed(3) + " мОм");

		if (step + 1 < steps && SeriesPauseSeconds > 0
				&& Loads_WaitUntil(Date.now() + SeriesPauseSeconds * 1000, "Пауза подбора"))
			return 0;
	}

	loads_fitKey = key;
	return 1;
}

// 0 — серия прошла. Ток в амперах, Pulse_ms — длительность полки трапеции.
function Loads_Pulse(Current, Pulse_ms)
{
	if (Current <= 0 || Pulse_ms <= 0)
	{
		print("Ток и длительность полки должны быть больше нуля");
		return 1;
	}

	for (var n = 1; n <= PulsesInASeries; n++)
	{
		var rc = Loads_OnePulse(Current, Pulse_ms);
		if (rc)
			return rc;

		if (n < PulsesInASeries && Loads_WaitUntil(Date.now() + SeriesPauseSeconds * 1000, "Пауза между импульсами"))
			return 8;
	}

	return 0;
}

// 0 — вышло время ResourceTestHours. Иначе тест остановлен.
function Loads_ResourceTest(Current, Pulse_ms, Counter)
{
	if (typeof Counter == "undefined")
		loads_counter = 1;
	else
		loads_counter = Counter;

	loads_csvReady = 0;
	loads_tableReady = 0;
	loads_rSumECH = 0;
	loads_rSumEK = 0;
	loads_rCount = 0;
	loads_rBaseECH = 0;
	loads_rBaseEK = 0;

	if (!Loads_FitVoltage(Current, Pulse_ms))
		return 1;

	var stopAt = Date.now() + ResourceTestHours * 3600 * 1000;
	var seriesStart = Date.now();
	var series = 0;

	while (Date.now() < stopAt)
	{
		if (Loads_Pulse(Current, Pulse_ms))
			return 1;

		series++;
		var next = seriesStart + series * DelayBetweenSeriesSeconds * 1000;
		if (Loads_WaitUntil(next, "Пауза между сериями"))
			return 1;
	}

	return 0;
}
