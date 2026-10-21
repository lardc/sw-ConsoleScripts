tek_measuring_device = "TBS1000C";

function TEK_tmc_PortInit()
{
	tmc.co();
}

function TEK_tmc_FactoryReset()
{
	tmc.w("factory");
	TEK_tmc_Busy();
}

function TEK_tmc_Busy()
{
	while(tmc.q("BUSY?").split(' ')[1] == 1)
	{
		p("OSC занят");
		sleep(10);
	}
}

function TEK_tmc_ForceTrig()
{
	tmc.w("trigger force");
	//sleep(2000);
}

function TEK_tmc_TrigSequence()
{
	tmc.w("ACQuire:STOPAfter SEQuence");
	tmc.w("ACQuire:STATE run");
}

function TEK_tmc_ChannelInit(Channel, Probe, Scale)
{
	tmc.w("ch" + Channel + ":probe:gain " + (1 / Probe));
	tmc.w("ch" + Channel + ":bandwidth 20");
	tmc.w("ch" + Channel + ":coupling dc");
	tmc.w("ch" + Channel + ":invert off");
	tmc.w("ch" + Channel + ":position -4");
	tmc.w("ch" + Channel + ":scale " + Scale);
}

function TEK_tmc_ChannelInvInit(Channel, Probe, Scale)
{
	tmc.w("ch" + Channel + ":probe:gain " + (1 / Probe));
	tmc.w("ch" + Channel + ":bandwidth 20");
	tmc.w("ch" + Channel + ":coupling dc");
	tmc.w("ch" + Channel + ":invert on");
	tmc.w("ch" + Channel + ":position -3");
	tmc.w("ch" + Channel + ":scale " + Scale);
}

function TEK_tmc_TriggerInit(Channel, Level)
{
	tmc.w("trigger:a:edge:source ch" + Channel);
	tmc.w("trigger:a:mode normal");
	tmc.w("trigger:a:type edge");
	tmc.w("trigger:a:edge:coupling dc");
	tmc.w("trigger:a:edge:slope rise");
	tmc.w("trigger:a:level " + Level);
}

function TEK_tmc_TriggerPulseExtInit(Level, Probe)
{
	tmc.w("trigger:a:edge:source aux");
	tmc.w("trigger:a:mode normal");
	tmc.w("trigger:a:type edge");
	tmc.w("trigger:a:edge:coupling dc");
	tmc.w("trigger:a:edge:slope rise");
	tmc.w("trigger:external:probe " + Probe);
	tmc.w("trigger:a:level " + Level);
}

function TEK_tmc_TriggerPulseInit(Channel, Level)
{
	TEK_tmc_TriggerPulseExtendedInit(Channel, Level, "hfrej", "5e-3", "positive", "outside");
}

function TEK_tmc_TriggerPulseExtendedInit(Channel, Level, Coupling, Width, Sign, Location)
{
	tmc.w("trigger:a:level " + Level);
	tmc.w("trigger:a:mode normal");
	tmc.w("trigger:a:type pulse");
	tmc.w("trigger:a:edge:coupling " + Coupling);
	tmc.w("trigger:a:pulse:width:width " + Width);
	tmc.w("trigger:a:pulse:width:polarity " + Sign);
	tmc.w("trigger:a:pulse:width:when " + Location);
	tmc.w("trigger:a:pulse:source ch" + Channel);
}

function TEK_tmc_AcquireSample()
{
	tmc.w("acquire:mode sample");
}

function TEK_tmc_AcquireAvg(AvgNum)
{
	tmc.w("acquire:mode average");
	tmc.w("acquire:numavg " + AvgNum);
}

function TEK_tmc_TriggerLevelF(Level)
{
	tmc.w("trigger:a:level " + Level.toFixed(2));
}

function TEK_tmc_Horizontal(Scale, Position)
{
	tmc.w("horizontal:scale " + Scale);
	tmc.w("horizontal:delay:time " + Position);
}

function TEK_tmc_Measure(ChannelID)
{
	var i = 0

	if (ChannelID > 4 || ChannelID < 1)
	{
		print("Invalid channel number");
		return 0;
	}

	return parseFloat(tmc.q("measurement:meas" + ChannelID + ":value?").split(' ')[1]);
}

function TEK_tmc_Measurement(ChannelID, Position)
{
	tmc.w("measurement:meas" + Position + ":source1 ch" + ChannelID);
	tmc.w("measurement:meas" + Position + ":type maximum");
	tmc.w("measurement:meas" + Position + ":state on");
}

function TEK_tmc_ScaleV(ChannelID, Value, Procent)
{
	var scale = (Value / (8 * Procent));
	tmc.w("ch" + ChannelID + ":scale " + scale);
}

function TEK_tmc_ChannelOn(ChannelID)
{
	if (ChannelID > 4 || ChannelID < 1)
		print("Invalid channel number");
	else
		tmc.w("sel:ch" + ChannelID + " on");
}

function TEK_tmc_ChannelOff(ChannelID)
{
	if (ChannelID > 4 || ChannelID < 1)
		print("Invalid channel number");
	else
		tmc.w("sel:ch" + ChannelID + " off");
}

// tmc.q заменяет конец строки пробелом, поэтому у ответа висит хвостовой пробел.
function TEK_tmc_ReplyNumber(Reply)
{
	var text = (Reply + "").replace(/^\s+|\s+$/g, "");
	var parts = text.split(" ");
	return parseFloat(parts[parts.length - 1]);
}

// tmc.q читает не больше 1024 символов. Кусок ASCII-кривой должен уложиться в этот предел.
TEK_tmc_CurveChunk = 100;

// Шаг и ноль оси времени последней считанной кривой, секунды.
// Время точки i: TEK_tmc_LastXZero + i * TEK_tmc_LastXIncr
TEK_tmc_LastXIncr = 0;
TEK_tmc_LastXZero = 0;

function TEK_tmc_PlotChannel(Channel)
{
	plot(TEK_tmc_GetChannelData(Channel), 1, 1);
}

// Оцифровка выбранного канала в вольтах.
// TBS1052C: CURVE? в ASCII, перевод по WFMOUTPRE (уже с учётом пробника).
// wave = TEK_tmc_GetChannelData(1);
function TEK_tmc_GetChannelData(Channel)
{
	if (Channel < 1 || Channel > 2)
	{
		print("Invalid channel number");
		return [];
	}

	tmc.w("data:source ch" + Channel);
	tmc.w("data:encdg ascii");
	tmc.w("data:width 1");

	var points = TEK_tmc_ReplyNumber(tmc.q("horizontal:recordlength?"));
	var ymult = TEK_tmc_ReplyNumber(tmc.q("wfmoutpre:ymult?"));
	var yoff = TEK_tmc_ReplyNumber(tmc.q("wfmoutpre:yoff?"));
	var yzero = TEK_tmc_ReplyNumber(tmc.q("wfmoutpre:yzero?"));
	TEK_tmc_LastXIncr = TEK_tmc_ReplyNumber(tmc.q("wfmoutpre:xincr?"));
	TEK_tmc_LastXZero = TEK_tmc_ReplyNumber(tmc.q("wfmoutpre:xzero?"));

	var res = [];
	var chunk = TEK_tmc_CurveChunk;
	for (var start = 1; start <= points; start += chunk)
	{
		var stop = start + chunk - 1;
		if (stop > points)
			stop = points;

		tmc.w("data:start " + start);
		tmc.w("data:stop " + stop);

		var raw = (tmc.q("curve?") + "").replace(/^\s+|\s+$/g, "");
		var sp = raw.indexOf(" ");
		if (raw.charAt(0) == ":" && sp >= 0)
			raw = raw.substring(sp + 1).replace(/^\s+|\s+$/g, "");

		var codes = raw.split(",");
		for (var i = 0; i < codes.length; i++)
		{
			var token = codes[i].replace(/^\s+|\s+$/g, "");
			if (token == "")
				continue;
			res.push((parseFloat(token) - yoff) * ymult + yzero);
		}
	}

	print("CH" + Channel + " points " + res.length);
	return res;
}