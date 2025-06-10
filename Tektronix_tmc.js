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

function TEK_tmc_TriggerPulseExtInit(Level, Probe, Width)
{
	tmc.w("trigger:a:edge:source aux");
	tmc.w("trigger:a:mode normal");
	tmc.w("trigger:a:type edge");
	tmc.w("trigger:a:edge:coupling dc");
	tmc.w("trigger:a:edge:slope rise");
	tmc.w("trigger:a:runt:width " + Width);
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

function TEK_tmc_PlotChannel(Channel)
{
	tmc.w("data:encdg rpb");
	tmc.w("data:width 2");
	tmc.w("data:start 1");
	tmc.w("data:stop 2000");

	plot(TEK_tmc_GetChannelData(Channel), 1,1);
}

function TEK_tmc_GetChannelData(Channel) 
{
	// read basic data
	var p_scale = tmc.q("ch" + Channel + ":scale?");
	var p_position = tmc.q("ch" + Channel + ":position?");

	// init data read
	tmc.w("data:source ch" + Channel);

	// read curve
	data_input = tmc.q("curve?");
	print("Channel " + Channel + " loaded");

	// validate data
	if ((data_input[0] != ":") || (data_input[1] != "C") || (data_input[2] != "U") ||
		(data_input[3] != "R") || (data_input[4] != "V") || (data_input[5] != "E"))
	{
		print("Invalid CH" + Channel + " data.");
		return;
	}

	// adjust data
	var res = [];
	for (var i = 6; i < 2048; ++i)
		res[i - 6] = (((data_input[i].charCodeAt(0) - 128 - p_position * 25) * p_scale / 25)*10000).toFixed(0);

	return res;
}