tek_measuring_device = "TPS2024";	// "TPS2014" "TPS2024"

function TEK_PortInit(PortNumber, BaudeRate)
{
	if (typeof devTek !== 'undefined')
		devTek.Disconnect();
	else
		devTek = cfg.CreateDevice();
	
	if (typeof BaudeRate === 'undefined')
		BaudeRate = 9600;
	
	devTek.Connect(PortNumber, BaudeRate);
}

function TEK_Send(Request)
{
	devTek.ss(Request);
	sleep(300);
}

function TEK_Exec(Request)
{
	var r = devTek.sswr(Request);
	return r.join("").replace(/(\n)/, "");
}

function TEK_Busy()
{
	while(TEK_Exec("BUSY?") == 1)
		sleep(100);
}

function TEK_ForceTrig()
{
	TEK_Send("trigger force");
}

function TEK_ChannelInit(Channel, Probe, Scale)
{
	TEK_Send("ch" + Channel + ":bandwidth on");
	TEK_Send("ch" + Channel + ":coupling dc");
	TEK_Send("ch" + Channel + ":invert off");
	TEK_Send("ch" + Channel + ":position -4");
	TEK_Send("ch" + Channel + ":probe " + Probe);
	TEK_Send("ch" + Channel + ":scale " + Scale);
}

function TEK_ChannelInvInit(Channel, Probe, Scale)
{
	TEK_Send("ch" + Channel + ":bandwidth on");
	TEK_Send("ch" + Channel + ":coupling dc");
	TEK_Send("ch" + Channel + ":invert on");
	TEK_Send("ch" + Channel + ":position -4");
	TEK_Send("ch" + Channel + ":probe " + Probe);
	TEK_Send("ch" + Channel + ":scale " + Scale);
}

function TEK_TriggerInit(Channel, Level)
{
	TEK_Send("trigger:main:level " + Level);
	TEK_Send("trigger:main:mode normal");
	TEK_Send("trigger:main:type edge");
	TEK_Send("trigger:main:edge:coupling dc");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Send("trigger:main:edge:source ch" + Channel);
}

function TEK_TriggerPulseInit(Channel, Level)
{
	TEK_TriggerPulseExtendedInit(Channel, Level, "hfrej", "5e-3", "positive", "outside");
}

function TEK_TriggerPulseExtendedInit(Channel, Level, Coupling, Width, Sign, Location)
{
	TEK_Send("trigger:main:level " + Level);
	TEK_Send("trigger:main:mode normal");
	TEK_Send("trigger:main:type pulse");
	TEK_Send("trigger:main:edge:coupling " + Coupling);
	TEK_Send("trigger:main:pulse:width:width " + Width);
	TEK_Send("trigger:main:pulse:width:polarity " + Sign);
	TEK_Send("trigger:main:pulse:width:when " + Location);
	TEK_Send("trigger:main:pulse:source ch" + Channel);
}

function TEK_MeasMaxInit(Channel, NumMeas)
{
	TEK_Send("measurement:meas" + NumMeas + ":source ch" + Channel);
	TEK_Send("measurement:meas" + NumMeas + ":type maximum");
}

function TEK_MeasPk2PkInit(Channel, NumMeas)
{
	TEK_Send("measurement:meas" + NumMeas + ":source ch" + Channel);
	TEK_Send("measurement:meas" + NumMeas + ":type pk2pk");
}

function TEK_MeasRiseTimeInit(Channel, NumMeas)
{
	TEK_Send("measurement:meas" + NumMeas + ":source ch" + Channel);
	TEK_Send("measurement:meas" + NumMeas + ":type rise");
}

function TEK_MeasFallTimeInit(Channel, NumMeas)
{
	TEK_Send("measurement:meas" + NumMeas + ":source ch" + Channel);
	TEK_Send("measurement:meas" + NumMeas + ":type fall");
}

function TEK_CursorTimeInit(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
}

function TEK_CursorTimeРosition(Channel, TimeCursor1, TimeCursor2)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:vbars:position1 " + TimeCursor1);
	TEK_Send("cursor:vbars:position2 " + TimeCursor2);
}

function TEK_AcquireSample()
{
	TEK_Send("acquire:mode sample");
}

function TEK_AcquireAvg(AvgNum)
{
	TEK_Send("acquire:mode average");
	TEK_Send("acquire:numavg " + AvgNum);
}

function TEK_TriggerLevelF(Level)
{
	TEK_Send("trigger:main:level " + Level.toFixed(2));
}

function TEK_Horizontal(Scale, Position)
{
	TEK_Send("horizontal:scale " + Scale);
	TEK_Send("horizontal:position " + Position);
}

function TEK_ChannelScale(Channel, Value)
{
	// 7 - number of scope grids in full scale
	var tek_scale = Value / 7;
	var tek_fixed_scale;
	var tek_scale_mul = 1;
	
	do
	{
		if (tek_scale < 2e-3 * tek_scale_mul)
		{
			tek_fixed_scale = 2e-3 * tek_scale_mul;
			break;
		}
		else if (tek_scale < 5e-3 * tek_scale_mul)
		{
			tek_fixed_scale = 5e-3 * tek_scale_mul;
			break;
		}
		else if (tek_scale < 10e-3 * tek_scale_mul)
		{
			tek_fixed_scale = 10e-3 * tek_scale_mul;
			break;
		}
		else
			tek_scale_mul = tek_scale_mul * 10;
	}
	while(1);
	
	tek_fixed_scale = tek_fixed_scale.toFixed(2)
	TEK_Send("ch" + Channel + ":scale " + parseFloat(tek_fixed_scale).toExponential());
}

function TEK_ScaleVertical(ChannelID, Value, Procent)
{
	Procent = Procent / 100;
	var scale = (Value / (8 * Procent));
	TEK_Send("ch" + Channel + ":scale " + Value);
}

function TEK_Measure(NumMeas)
{
	if (NumMeas > 5 || NumMeas < 1)
	{
		print("Invalid meas number");
		return 0;
	}
	else
		return parseFloat(TEK_Exec("measurement:meas" + NumMeas + ":value?"));
}

function TEK_MeasureCursor(NumberCursor)
{
	if (NumberCursor > 2 || NumberCursor < 1)
	{
		print("Invalid cursor number");
		return 0;
	}
	else
		return parseFloat(TEK_Exec("cursor:vbars:hpos" + NumberCursor + "?"));
}

function TEK_MeasureCursorDelta()
{
	return parseFloat(TEK_Exec("cursor:vbars:delta?"));
}

function TEK_ChannelOn(ChannelID)
{
	if (ChannelID > 4 || ChannelID < 1)
		print("Invalid channel number");
	else
		TEK_Send("sel:ch" + ChannelID + " on");
}

function TEK_ChannelOff(ChannelID)
{
	if (ChannelID > 4 || ChannelID < 1)
		print("Invalid channel number");
	else
		TEK_Send("sel:ch" + ChannelID + " off");
}

function TEK_GD_Init(Port)
{
	TEK_PortInit(Port);
	TEK_Send("data:encdg rpb");
	TEK_Send("data:width 1");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");
}

function TEK_PlotChannel(Channel)
{
	plot(GetChannelData(Channel), 1,1);
}

function GetChannelData(Channel) 
{
	// read basic data
	var p_scale = TEK_Exec("ch" + Channel + ":scale?");
	var p_position = TEK_Exec("ch" + Channel + ":position?");
	
	// init data read
	TEK_Send("data:source ch" + Channel);
	
	// read curve
	var data_input = TEK_Exec("curve?");
	//print("Channel " + Channel + " loaded");

	// validate data
	if ((data_input[0] != "#") || (data_input[1] != 4) || (data_input[2] != 2) ||
			(data_input[3] != 5) || (data_input[4] != 0) || (data_input[5] != 0))
	{
		print("Invalid CH" + Channel + " data.");
		return;
	}

	// adjust data
	var res = [];
	for (var i = 6; i < 2506; ++i)
		res[i - 6] = (data_input[i].charCodeAt(0) - 128 - p_position * 25) * p_scale / 25;
	
	//plot(res, 1, 1);

	return res;
}

function TEK_GetTimeScale()
{
	return parseFloat(TEK_Exec("horizontal:main:scale?"));
}

function TEK_CALC_dVdt(Data, LowLevel10, HighLevel90)
{
	var dVdt = 0
	var DataLimit = []
	var Linear = [];
	var TimeStep = TEK_GetTimeScale() / 250
	var MaxLevel = Data[0]

	var sumx = 0;
	var sumy = 0;
	var sumx2 = 0;
	var sumxy = 0;
	var k = 0;
	var b = 0;
	var i_position = 0
	var i_correct = 0;

	// поиск максимального значения для выбора границ
	for (var i = 0; i < Data.length; ++i)
	{
		if (Data[i] > MaxLevel)
			MaxLevel = Data[i]
		if (Data[i] < 0)
			Data[i] = 0;
	}

	var LowValue = MaxLevel * LowLevel10 / 100
	var HighValue = MaxLevel * HighLevel90 / 100

	// исключаем точки которые менее или более указанных границ
	for (var i = 0; (i < Data.length - 1) && Data[i] < MaxLevel; ++i)
		if(Data[i] > LowValue && Data[i] < HighValue)
		{
			DataLimit.push(Data[i])
		}
		else if (Data[i] <= LowValue)
			i_position = i;

	// рассчет апроксимационной прямой
	for (var i = 0; i < DataLimit.length - 1; i++)
	{
		sumx += i;
		sumy += DataLimit[i];
		sumx2 += i * i;
		sumxy += i * DataLimit[i];
	}

	k = (DataLimit.length * sumxy - (sumx * sumy)) / (DataLimit.length * sumx2 - sumx * sumx);
	b = (sumy - k * sumx) / DataLimit.length;

	// построение апроксимационной прямой на графике
	while ((k * i_correct + b) > 0)
		i_correct -= 1;
	i_correct += 1;

	for (var i = 0; (k * i_correct + b) < MaxLevel; i_correct++)
		Linear[i + i_position + i_correct] = k * i_correct + b;
	
	plot2(Data, Linear, 1, 1)

	dVdt = k / TimeStep * 1e-6;
	//p("dVdt approx("+ LowLevel10 +"-"+ HighLevel90 +") = " + (dVdt).toFixed(2) + " V/us");

	return dVdt;
}