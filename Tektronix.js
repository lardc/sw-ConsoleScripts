

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

function TEK_Measure(ChannelID)
{
	if (ChannelID > 4 || ChannelID < 1)
	{
		print("Invalid channel number");
		return 0;
	}
	else
		return parseFloat(TEK_Exec("measurement:meas" + ChannelID + ":value?")).toFixed(4);
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

function TEK_PlotChannel(Channel)
{
	var Data = [];
	Data = (GetChannelData(Channel));
	plot(Data, 1,1);
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
	print("Channel " + Channel + " loaded");

	// validate data
	if(tek_measuring_device == "TPS2014")
	{
		if ((data_input[0] != "#") || (data_input[1] != 4) || (data_input[2] != 5) ||
			(data_input[3] != 0) || (data_input[4] != 0) || (data_input[5] != 0))
		{
			print("Invalid CH" + Channel + " data.");
			return;
		}
	}
	else
	{
		if ((data_input[0] != "#") || (data_input[1] != 4) || (data_input[2] != 2) ||
			(data_input[3] != 5) || (data_input[4] != 0) || (data_input[5] != 0))
		{
			print("Invalid CH" + Channel + " data.");
			return;
		}
	}

	// adjust data
	var res = [];
	for (var i = 6; i < 2506; ++i)
		res[i - 6] = (((data_input[i].charCodeAt(0) - 128 - p_position * 25) * p_scale / 25)*10000).toFixed(0);
	
	return res;
}